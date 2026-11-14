/**
 * Test loader (no dependencies, no database).
 *
 * Copies the TypeScript sources a test needs into a temporary folder, rewrites relative imports to explicit
 * `.ts` paths, replaces the database client / logger with test doubles and stubs third-party packages, then
 * imports the result. Node (>= 22.6, type stripping) runs the TypeScript directly, so the REAL source files
 * are what get tested.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

// Replaced wholesale: the database client and the logger.
const STUB_FILES = {
    'utils/db.server.ts': 'export const db = globalThis.__TEST_DB__;\n',
    'utils/logger.ts': "globalThis.__TEST_LOG__ = globalThis.__TEST_LOG__ ?? [];\nexport default { warn: (...args) => globalThis.__TEST_LOG__.push(['warn', ...args]), info: () => {}, error: () => {}, debug: () => {} };\n"
};

// Third-party packages are replaced by tiny stand-ins.
const STUB_PACKAGES = {
    // compare is real enough to tell right from wrong: only the exact hash this stub produced matches.
    bcrypt: "export default { hash: async (value) => 'hashed:' + value, compare: async (plain, hash) => typeof hash === 'string' && hash === 'hashed:' + plain };",
    // Every signed payload is recorded in globalThis.__TEST_JWT__ so tests can prove NO session token was issued.
    // Tokens carry their payload: 'stub.<base64url JSON>.<secret>'. verify() checks the shape and the secret and supports
    // both the callback and the synchronous style, like the real library (payload.__expired makes it a TokenExpiredError).
    jsonwebtoken:
        "const enc = (p) => Buffer.from(JSON.stringify(p)).toString('base64url');" +
        "const check = (token, secret) => { const parts = String(token).split('.'); if (parts.length !== 3 || parts[0] !== 'stub') return { error: Object.assign(new Error('invalid token'), { name: 'JsonWebTokenError' }) }; if (parts[2] !== secret) return { error: Object.assign(new Error('invalid signature'), { name: 'JsonWebTokenError' }) }; const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); if (payload.__expired) return { error: Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }) }; return { payload }; };" +
        "export default { sign: (payload, secret) => { (globalThis.__TEST_JWT__ = globalThis.__TEST_JWT__ ?? []).push(payload); return 'stub.' + enc(payload) + '.' + secret; }, verify: (token, secret, cb) => { const r = check(token, secret); if (typeof cb === 'function') { return r.error ? cb(r.error) : cb(null, r.payload); } if (r.error) throw r.error; return r.payload; } };",
    '@prisma/client': "export const Role = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', APPLICANT: 'APPLICANT', WAITLISTED: 'WAITLISTED', STUDENT: 'STUDENT', ALUMNI: 'ALUMNI' }; export const Prisma = {}; export const PaymentType = { MONTHLY: 'MONTHLY', TERM: 'TERM' }; export const NotificationType = { FEE: 'FEE', FEEOVERDUE: 'FEEOVERDUE' }; export const AttendanceStatus = { PRESENT: 'PRESENT', ABSENT: 'ABSENT', EXCUSED: 'EXCUSED', LATE: 'LATE', LEAVE: 'LEAVE' }; export const PaymentStatus = { PENDING: 'PENDING', PAID: 'PAID', NODUES: 'NODUES', DUE: 'DUE', OVERDUE: 'OVERDUE', FAILED: 'FAILED' }; export const PaymentMethod = { ONLINE: 'ONLINE', SCHOOL: 'SCHOOL', NA: 'NA', DISCOUNT: 'DISCOUNT', CREDIT_CARD: 'CREDIT_CARD', CASH: 'CASH', OTHER: 'OTHER', CREDIT_BALANCE: 'CREDIT_BALANCE' }; export const Day = { MONDAY: 'MONDAY', TUESDAY: 'TUESDAY', WEDNESDAY: 'WEDNESDAY', THURSDAY: 'THURSDAY', FRIDAY: 'FRIDAY', SATURDAY: 'SATURDAY', SUNDAY: 'SUNDAY' };",
    // Mail never leaves the test process: messages are recorded in globalThis.__TEST_MAILS__.
    // Set globalThis.__TEST_MAIL_FAIL__ = true to simulate the mail relay refusing the message.
    nodemailer:
        "export default { createTransport: () => ({ sendMail: async (message) => { if (globalThis.__TEST_MAIL_FAIL__) throw new Error('relay down'); (globalThis.__TEST_MAILS__ = globalThis.__TEST_MAILS__ ?? []).push(message); return { rejected: [], messageId: 'test' }; } }) };",
    zod: 'export const z = new Proxy({}, { get: () => () => ({}) });',
    dotenv: 'export default { config() {} };',
    'date-fns': 'export const parseISO = (value) => new Date(value); export const startOfDay = (date) => date;',
    'date-fns-tz': "export const toZonedTime = (date) => date; export const format = () => '';"
};

// Sub-path imports of a package (import S3 from 'aws-sdk/clients/s3'): written as a package with an `exports` entry, because
// Node's ES-module loader cannot import a bare directory. S3 never talks to AWS in tests: every signed-URL request is recorded in
// globalThis.__TEST_S3__ and a fake URL is returned.
const STUB_SUBPATHS = {
    'aws-sdk': {
        './clients/s3': "export default class S3 { constructor(options) { this.options = options; } async getSignedUrlPromise(operation, params) { (globalThis.__TEST_S3__ = globalThis.__TEST_S3__ ?? []).push({ operation, params }); return 'https://signed.test/' + encodeURIComponent(params.Key); } }"
    }
};

// Imports that only carry TypeScript types are removed from the copied source.
const TYPE_ONLY_IMPORT = /^import\s+(?!type\s)[^;]*?from\s+['"]((?:\.\.?\/)+(?:[^'"]*\/)?(?:types|schema)\/[^'"]+|express)['"];?[ \t]*$/gm;

const resolveRelative = (fromFile, specifier) => {
    const base = path.resolve(path.dirname(fromFile), specifier);
    for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
};

const relativeSpecifiers = (code) => {
    const found = [];
    const pattern = /^(import|export)\s+(type\s+)?[^;]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        if (!match[2]) found.push(match[3]); // `import type` needs no copy
    }
    return found;
};

/** options.stubFiles: { 'relative/src/path.ts': 'replacement source' } swaps a whole module for a test double (this loader only). */
export function createLoader(entries, options = {}) {
    const stubFiles = { ...STUB_FILES, ...(options.stubFiles ?? {}) };
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slms-tests-'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');

    for (const [name, code] of Object.entries(STUB_PACKAGES)) {
        const dir = path.join(root, 'node_modules', name);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
        fs.writeFileSync(path.join(dir, 'index.js'), code);
    }
    for (const [pkg, subpaths] of Object.entries(STUB_SUBPATHS)) {
        const dir = path.join(root, 'node_modules', pkg);
        fs.mkdirSync(dir, { recursive: true });
        const exportsMap = {};
        Object.entries(subpaths).forEach(([subpath, code], index) => {
            const file = `stub-${index}.js`;
            exportsMap[subpath] = `./${file}`;
            fs.writeFileSync(path.join(dir, file), code);
        });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: pkg, type: 'module', exports: exportsMap }));
    }
    for (const [rel, code] of Object.entries(stubFiles)) {
        const target = path.join(root, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, code);
    }

    const copied = new Set();
    const queue = entries.map((entry) => path.join(SRC, entry));
    while (queue.length > 0) {
        const file = queue.shift();
        const rel = path.relative(SRC, file);
        if (copied.has(rel) || stubFiles[rel]) continue;
        copied.add(rel);
        let code = fs.readFileSync(file, 'utf8');
        for (const specifier of relativeSpecifiers(code)) {
            const resolved = resolveRelative(file, specifier);
            if (resolved) queue.push(resolved);
        }
        code = code.replace(TYPE_ONLY_IMPORT, '');
        code = code.replace(/(from\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (whole, from, quote, specifier) => {
            const resolved = resolveRelative(file, specifier);
            if (!resolved) return whole;
            let rewritten = path.relative(path.dirname(file), resolved).split(path.sep).join('/');
            if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
            return `${from}${quote}${rewritten}${quote}`;
        });
        const target = path.join(root, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, code);
    }

    return (relativeSourcePath) => import(pathToFileURL(path.join(root, relativeSourcePath)).href);
}
