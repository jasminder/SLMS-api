/**
 * Item 35 (E1): email to a selected group of students.
 *  1. the rules: where it goes (student email, parent email, or both), one email per address, merge fields, validation
 *  2. the service on a small stand-in database and a stand-in mail sender: the record, the progress, partial failure
 *  3. the wiring: ADMIN only, mounted, and the migration is additive
 * Nothing here touches a real database or sends a real email.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../src');
const RULES = 'service/bulk.email.service/bulk.email.rules.ts';
const SERVICE = 'service/bulk.email.service/bulk.email.service.ts';
const rules = await createLoader([RULES])(RULES);

const S = (id, first, studentEmail, parentEmail) => ({ id, akaalId: 5000 + id, firstName: first, lastName: 'Singh', studentEmail, parentEmail });

describe('where the email goes', () => {
    const students = [S(1, 'Aman', 'family@example.test', 'dad@example.test'), S(2, 'Bani', 'family@example.test', 'dad@example.test'), S(3, 'Chet', 'chet@example.test', null), S(4, 'Dev', null, null)];
    it('student email only: one email per address, names of every child on that address', () => {
        const r = rules.buildRecipients(students, 'STUDENT');
        assert.deepEqual(r.recipients.map((x) => [x.email, x.studentNames]), [['family@example.test', ['Aman Singh', 'Bani Singh']], ['chet@example.test', ['Chet Singh']]]);
        assert.deepEqual(r.withoutAddress.map((x) => x.studentId), [4]);
    });
    it('parent email only', () => {
        const r = rules.buildRecipients(students, 'PARENT');
        assert.deepEqual(r.recipients.map((x) => [x.email, x.studentIds]), [['dad@example.test', [1, 2]]]);
        assert.deepEqual(r.withoutAddress.map((x) => x.studentId), [3, 4]);
    });
    it('both: every address once, and a student with only one of them is still reached', () => {
        const r = rules.buildRecipients(students, 'BOTH');
        assert.deepEqual(r.recipients.map((x) => x.email), ['family@example.test', 'dad@example.test', 'chet@example.test']);
        assert.deepEqual(r.withoutAddress.map((x) => x.studentId), [4]);
    });
    it('the same address on a student and a parent is only sent once', () => {
        const r = rules.buildRecipients([S(1, 'Aman', 'same@example.test', ' SAME@example.test ')], 'BOTH');
        assert.equal(r.recipients.length, 1);
    });
    it('addresses are trimmed and lower-cased, and a bad one is skipped and reported', () => {
        const r = rules.buildRecipients([S(1, 'Aman', ' Mixed@Example.TEST ', 'not-an-email')], 'BOTH');
        assert.deepEqual(r.recipients.map((x) => x.email), ['mixed@example.test']);
        assert.deepEqual(r.invalidAddresses, ['not-an-email']);
    });
    it('a student with only a bad address counts as having none', () => {
        const r = rules.buildRecipients([S(1, 'Aman', 'bad address', null)], 'STUDENT');
        assert.equal(r.recipients.length, 0);
        assert.equal(r.withoutAddress.length, 1);
    });
});

describe('merge fields', () => {
    it('joins names naturally', () => {
        assert.equal(rules.joinNames(['A']), 'A');
        assert.equal(rules.joinNames(['A', 'B']), 'A and B');
        assert.equal(rules.joinNames(['A', 'B', 'C']), 'A, B and C');
        assert.equal(rules.joinNames([]), '');
    });
    it('{{student_names}} is replaced, with or without spaces and in any case', () => {
        assert.equal(rules.mergeFields('Hello {{student_names}}, {{ STUDENT_NAMES }}!', ['A', 'B']), 'Hello A and B, A and B!');
    });
    it('an unknown field is rejected, never sent as raw text. The amount is not a merge field.', () => {
        assert.deepEqual(rules.findUnknownPlaceholders('Pay {{amount}} for {{student_names}} {{ amount }}'), ['{{amount}}', '{{ amount }}']);
        const errors = rules.validateBulkEmailInput({ studentIds: [1], mode: 'BOTH', subject: 'Fees', message: 'You owe {{amount_due}}' });
        assert.match(errors.join(' '), /Unknown merge field: \{\{amount_due\}\}/);
    });
});

describe('validation', () => {
    const ok = { studentIds: [1, 2], mode: 'BOTH', subject: 'Hello', message: 'Body' };
    it('a good request has no errors', () => assert.deepEqual(rules.validateBulkEmailInput(ok), []));
    it('needs students, a valid choice of where it goes, a subject and a message', () => {
        assert.match(rules.validateBulkEmailInput({ ...ok, studentIds: [] }).join(' '), /Select at least one student/);
        assert.match(rules.validateBulkEmailInput({ ...ok, studentIds: ['x'] }).join(' '), /not valid/);
        assert.match(rules.validateBulkEmailInput({ ...ok, mode: 'ALL' }).join(' '), /Choose where the email goes/);
        assert.match(rules.validateBulkEmailInput({ ...ok, subject: '  ' }).join(' '), /subject is required/);
        assert.match(rules.validateBulkEmailInput({ ...ok, message: '' }).join(' '), /message is required/);
    });
    it('has limits', () => {
        assert.match(rules.validateBulkEmailInput({ ...ok, studentIds: Array.from({ length: 2001 }, (_, i) => i + 1) }).join(' '), /at most 2000/);
        assert.match(rules.validateBulkEmailInput({ ...ok, subject: 'x'.repeat(201) }).join(' '), /at most 200/);
        assert.match(rules.validateBulkEmailInput({ ...ok, message: 'x'.repeat(20001) }).join(' '), /at most 20000/);
    });
});

/* ---------- service on a stand-in database and a stand-in mailer ---------- */
function makeDb(students) {
    const state = { emails: [], recipients: [], nextId: 1 };
    return {
        state,
        student: {
            findMany: async ({ where }) =>
                students.filter((s) => where.id.in.includes(s.id)).map((s) => ({ id: s.id, akaalId: s.akaalId, personalDetails: { firstName: s.firstName, lastName: s.lastName, email: s.studentEmail }, parentsDetails: s.parentEmail === undefined ? null : { parentEmail: s.parentEmail } }))
        },
        bulkEmail: {
            create: async ({ data }) => {
                const row = { id: state.nextId++, sentCount: 0, failedCount: 0, createdAt: new Date(), finishedAt: null, ...data };
                state.emails.push(row);
                return row;
            },
            update: async ({ where, data }) => Object.assign(state.emails.find((e) => e.id === where.id), data),
            findMany: async () => [...state.emails].reverse(),
            findUnique: async ({ where }) => {
                const e = state.emails.find((x) => x.id === where.id);
                return e ? { ...e, recipients: state.recipients.filter((r) => r.bulkEmailId === e.id) } : null;
            }
        },
        bulkEmailRecipient: {
            createMany: async ({ data }) => state.recipients.push(...data.map((d) => ({ id: state.nextId++, status: 'PENDING', error: null, sentAt: null, ...d }))),
            findMany: async ({ where }) => state.recipients.filter((r) => r.bulkEmailId === where.bulkEmailId && r.status === where.status),
            update: async ({ where, data }) => Object.assign(state.recipients.find((r) => r.id === where.id), data)
        }
    };
}
const mailer = (failFor = []) => {
    const sent = [];
    return { sent, closed: false, send: async (m) => (failFor.includes(m.to) ? { ok: false, error: 'mailbox full' } : (sent.push(m), { ok: true })), close() { this.closed = true; } };
};
const load = async (db) => {
    globalThis.__TEST_DB__ = db;
    return createLoader([SERVICE, RULES])(SERVICE);
};
const STUDENTS = [S(1, 'Aman', 'family@example.test', 'dad@example.test'), S(2, 'Bani', 'family@example.test', 'dad@example.test'), S(3, 'Chet', 'chet@example.test', undefined)];
const admin = { id: 1, email: 'admin@example.test' };

describe('preview', () => {
    it('counts the addresses and the students without one, and sends nothing', async () => {
        const db = makeDb([...STUDENTS, S(4, 'Dev', null, undefined)]);
        const svc = await load(db);
        const p = await svc.previewBulkEmail({ studentIds: [1, 2, 3, 4], mode: 'BOTH' });
        assert.equal(p.studentCount, 4);
        assert.equal(p.addressCount, 3);
        assert.deepEqual(p.withoutAddress.map((x) => x.studentId), [4]);
        assert.equal(p.sample.length, 3);
        assert.equal(db.state.emails.length, 0);
    });
});

describe('sending', () => {
    it('sends one email per address with the names merged, and records everything', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const m = mailer();
        const r = await svc.startBulkEmail({ studentIds: [1, 2, 3], mode: 'BOTH', subject: 'Fees for {{student_names}}', message: 'Please check the amount due in the app for {{student_names}}.' }, admin, m);
        await r.done;
        assert.equal(r.recipientCount, 3);
        assert.deepEqual(m.sent.map((x) => x.to).sort(), ['chet@example.test', 'dad@example.test', 'family@example.test']);
        const family = m.sent.find((x) => x.to === 'family@example.test');
        assert.equal(family.subject, 'Fees for Aman Singh and Bani Singh');
        assert.equal(family.text, 'Please check the amount due in the app for Aman Singh and Bani Singh.');
        const rec = db.state.emails[0];
        assert.deepEqual([rec.status, rec.sentCount, rec.failedCount, rec.recipientCount, rec.studentCount, rec.sentByEmail, rec.recipientMode], ['DONE', 3, 0, 3, 3, 'admin@example.test', 'BOTH']);
        assert.ok(rec.finishedAt);
        assert.ok(db.state.recipients.every((x) => x.status === 'SENT' && x.sentAt));
        assert.equal(m.closed, true);
    });
    it('one failing address does not stop the rest, and its reason is recorded', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const m = mailer(['dad@example.test']);
        const r = await svc.startBulkEmail({ studentIds: [1, 2, 3], mode: 'BOTH', subject: 'Hello', message: 'Body' }, admin, m);
        await r.done;
        const rec = db.state.emails[0];
        assert.deepEqual([rec.status, rec.sentCount, rec.failedCount], ['DONE', 2, 1]);
        const failed = db.state.recipients.find((x) => x.status === 'FAILED');
        assert.deepEqual([failed.email, failed.error], ['dad@example.test', 'mailbox full']);
    });
    it('the student email only, with the amount never merged: no amount is ever put in the text', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const m = mailer();
        const r = await svc.startBulkEmail({ studentIds: [1, 2, 3], mode: 'STUDENT', subject: 'Hello', message: 'Please check the amount due in the app.' }, admin, m);
        await r.done;
        assert.deepEqual(m.sent.map((x) => x.to).sort(), ['chet@example.test', 'family@example.test']);
        assert.ok(m.sent.every((x) => !/\$/.test(x.text)));
    });
    it('refuses a bad request before anything is created or sent', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const m = mailer();
        await assert.rejects(() => svc.startBulkEmail({ studentIds: [], mode: 'BOTH', subject: 'x', message: 'y' }, admin, m), /Select at least one student/);
        await assert.rejects(() => svc.startBulkEmail({ studentIds: [1], mode: 'BOTH', subject: 'x', message: 'Owe {{amount}}' }, admin, m), /Unknown merge field/);
        assert.equal(db.state.emails.length, 0);
        assert.equal(m.sent.length, 0);
    });
    it('refuses when nobody selected has an address for the choice', async () => {
        const db = makeDb([S(4, 'Dev', null, undefined)]);
        const svc = await load(db);
        await assert.rejects(() => svc.startBulkEmail({ studentIds: [4], mode: 'BOTH', subject: 'x', message: 'y' }, admin, mailer()), /None of the selected students has an email address/);
        assert.equal(db.state.emails.length, 0);
    });
    it('if the mailer itself breaks, the record is marked FAILED and the connection is closed', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const broken = { closed: false, send: async () => { throw new Error('smtp down'); }, close() { this.closed = true; } };
        const r = await svc.startBulkEmail({ studentIds: [1], mode: 'STUDENT', subject: 'x', message: 'y' }, admin, broken);
        await r.done;
        assert.equal(db.state.emails[0].status, 'FAILED');
        assert.equal(broken.closed, true);
    });
});

describe('a test copy to the admin only', () => {
    it('sends one email, to the admin only, marked [TEST], with the names merged, and records nothing', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const m = mailer();
        const r = await svc.sendTestBulkEmail({ studentIds: [1, 2, 3], subject: 'Fees for {{student_names}}', message: 'Check the app for {{student_names}}.' }, 'admin@example.test', m);
        assert.deepEqual(r, { sentTo: 'admin@example.test' });
        assert.equal(m.sent.length, 1);
        assert.deepEqual([m.sent[0].to, m.sent[0].subject], ['admin@example.test', '[TEST] Fees for Aman Singh, Bani Singh and Chet Singh']);
        assert.equal(db.state.emails.length, 0);
        assert.equal(db.state.recipients.length, 0);
        assert.equal(m.closed, true);
    });
    it('works with no students selected, using a stand-in name, and still checks the subject and message', async () => {
        const svc = await load(makeDb(STUDENTS));
        const m = mailer();
        await svc.sendTestBulkEmail({ subject: 'Hello {{student_names}}', message: 'Body' }, 'admin@example.test', m);
        assert.equal(m.sent[0].subject, '[TEST] Hello Student Name');
        await assert.rejects(() => svc.sendTestBulkEmail({ subject: '', message: 'Body' }, 'admin@example.test', mailer()), /subject is required/);
        await assert.rejects(() => svc.sendTestBulkEmail({ subject: 'x', message: 'Owe {{amount}}' }, 'admin@example.test', mailer()), /Unknown merge field/);
    });
    it('refuses when the admin has no address, and reports a mail failure', async () => {
        const svc = await load(makeDb(STUDENTS));
        await assert.rejects(() => svc.sendTestBulkEmail({ subject: 'x', message: 'y' }, '', mailer()), /no email address/);
        await assert.rejects(() => svc.sendTestBulkEmail({ subject: 'x', message: 'y' }, 'admin@example.test', mailer(['admin@example.test'])), /could not be sent: mailbox full/);
    });
});

describe('the sent record', () => {
    it('shows progress from the rows, and a send cut off for over an hour as INTERRUPTED', async () => {
        const db = makeDb(STUDENTS);
        const svc = await load(db);
        const r = await svc.startBulkEmail({ studentIds: [1, 3], mode: 'STUDENT', subject: 'Hello', message: 'Body' }, admin, mailer());
        await r.done;
        const detail = await svc.getBulkEmail(r.id);
        assert.deepEqual([detail.sentCount, detail.failedCount, detail.pendingCount, detail.recipients.length], [2, 0, 0, 2]);
        assert.deepEqual(detail.recipients.map((x) => x.studentNames), [['Aman Singh'], ['Chet Singh']]);
        db.state.emails[0].status = 'SENDING';
        db.state.emails[0].createdAt = new Date(Date.now() - 2 * 3600 * 1000);
        assert.equal((await svc.listBulkEmails())[0].status, 'INTERRUPTED');
        await assert.rejects(() => svc.getBulkEmail(999), /not found/);
    });
});

describe('wiring', () => {
    const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
    it('every route is ADMIN only and the router is mounted', () => {
        const route = read('route/admin.route/admin.bulk.email.route/admin.bulk.email.route.ts');
        for (const p of ["'/preview'", "'/test'", "'/send'", "'/'", "'/:id'"]) assert.ok(route.includes(`route(${p})`), p);
        assert.equal((route.match(/restrict\('ADMIN'\)/g) ?? []).length, 5);
        assert.equal((route.match(/protectRoute/g) ?? []).length >= 5, true);
        assert.match(fs.readFileSync(path.join(SRC, '../index.ts'), 'utf8'), /app\.use\('\/api\/v1\/admin\/bulk-email', adminBulkEmailRoute\)/);
    });
    it('the migration is additive and creates the two tables', () => {
        const sql = fs.readFileSync(path.join(SRC, '../prisma/migrations/20261115090000_add_bulk_email/migration.sql'), 'utf8');
        assert.equal((sql.match(/CREATE TABLE/g) ?? []).length, 2);
        assert.doesNotMatch(sql, /DROP |ALTER TABLE "(?!BulkEmailRecipient)|DELETE FROM|UPDATE\s+"/);
    });
});
