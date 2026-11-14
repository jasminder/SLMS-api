/**
 * REAL-STACK regression checks (running Express API + PostgreSQL). Not part of `npm run test:unit`.
 *
 * Verifies, over real HTTP, that
 *   1. a bad session (deleted user, login still pending password setup) gets a clean 401/403 on protected routes AND on
 *      token refresh, and the API process keeps answering afterwards (it used to shut itself down), and
 *   2. teacher registration reports a reused WWC card number, a reused email and a reused name + date of birth with
 *      three DIFFERENT messages.
 *
 * SAFETY: refuses to run unless API_BASE points at localhost / 127.0.0.1. Use an ISOLATED local database with synthetic
 * data only. It creates one teacher applicant and (if needed) one pending teacher login there.
 *
 * Environment:
 *   API_BASE              default http://localhost:5001/api/v1
 *   ADMIN_EMAIL, ADMIN_PASSWORD   an ADMIN login of that local database
 *   SECRET_STR, REFRESH_SECRET_STR   the API's JWT secrets (to sign tokens for the scenarios)
 *   PENDING_TEACHER_ID    id of an approved, active teacher with NO login yet (a pending login is created for it)
 *   PENDING_LOGIN_EMAIL   a login email nobody uses yet (default pending.session.qa@local.test)
 * Run from the SLMS-api folder (so jsonwebtoken resolves):  node tests/integration/session-errors.integration.mjs
 */
import { createRequire } from 'node:module';

const BASE = process.env.API_BASE ?? 'http://localhost:5001/api/v1';
const host = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) {
    console.error(`REFUSING: API_BASE host "${host}" is not local. This script must only run against an isolated local stack.`);
    process.exit(2);
}
for (const name of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SECRET_STR', 'REFRESH_SECRET_STR', 'PENDING_TEACHER_ID']) {
    if (!process.env[name]) {
        console.error(`Missing environment variable ${name}`);
        process.exit(2);
    }
}
const jwt = createRequire(`${process.cwd()}/package.json`)('jsonwebtoken');
const results = [];
const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + String(detail).slice(0, 220) : ''}`);
};
const call = async (method, path, { token, body, cookie } = {}) => {
    try {
        const res = await fetch(BASE + path, {
            method,
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(cookie ? { cookie } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(15000) // no answer = a hang = the failure this script exists to catch
        });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch {
            json = { raw: text.slice(0, 120) };
        }
        return { status: res.status, json };
    } catch (e) {
        return { status: `NO RESPONSE (${e.cause?.code ?? e.name})`, json: {} };
    }
};
const alive = async () => (await call('GET', '/auth/refresh')).status === 400; // no cookie -> 400 when the API is up

// ---- admin login and a pending teacher login
const admin = await call('POST', '/auth/login-user', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
if (!admin.json.accessToken) {
    console.error('Admin login failed', admin.status);
    process.exit(2);
}
const token = admin.json.accessToken;
const pendingEmail = process.env.PENDING_LOGIN_EMAIL ?? 'pending.session.qa@local.test';
const created = await call('POST', `/admin/administration/teacher/create-login/${process.env.PENDING_TEACHER_ID}`, { token, body: { loginEmail: pendingEmail, confirmLoginEmail: pendingEmail, ownershipConfirmed: true } });
console.log(`(pending login setup: create-login answered ${created.status}; 409 LOGIN_ALREADY_EXISTS is fine on a re-run)`);

const signed = (email, secret, expiresIn = '1h') => jwt.sign({ email, role: 'TEACHER', id: 99999 }, secret, { expiresIn });
const scenarios = [
    ['a valid token for a user that no longer exists', 'deleted.user.qa@local.test', 401],
    ['a valid token for a login still pending password setup', pendingEmail, 403]
];
for (const [label, email, expected] of scenarios) {
    const protectedRoute = await call('GET', `/teacher/teacher-detail/${process.env.PENDING_TEACHER_ID}`, { token: signed(email, process.env.SECRET_STR) });
    check(`protected route, ${label}: ${expected} and the API keeps running`, protectedRoute.status === expected && (await alive()), `response=${protectedRoute.status} alive=${await alive()}`);
    const refresh = await call('GET', '/auth/refresh', { cookie: `refreshToken=${signed(email, process.env.REFRESH_SECRET_STR, '1d')}` });
    check(`token refresh, ${label}: ${expected}, no access token, and the API keeps running`, refresh.status === expected && !refresh.json.accessToken && (await alive()), `response=${refresh.status} alive=${await alive()}`);
}
const burst = await Promise.all(Array.from({ length: 20 }, (_, i) => call('GET', `/teacher/teacher-detail/${process.env.PENDING_TEACHER_ID}`, { token: signed(i % 2 ? pendingEmail : 'deleted.user.qa@local.test', process.env.SECRET_STR) })));
check('20 concurrent bad-session requests all get 401/403 and the API keeps running', burst.every((r) => r.status === 401 || r.status === 403) && (await alive()), burst.map((r) => r.status).join(','));

// ---- registration messages
const stamp = Date.now();
const application = (o) => ({
    teacherPersonalDetails: { firstName: o.first, lastName: o.last, DOB: o.dob, gender: 'female', email: o.email, contact: '0400000999', address: `${stamp} Test Street`, suburb: 'Clyde North', state: 'Victoria', country: 'Australia', postcode: '3978', image: 'x' },
    teacherEmergencyContact: { contactPerson: 'Syn Person', contactNumber: '0411111111', relationship: 'Friend' },
    teacherWWCHealthInformation: { medicalCondition: 'None', childrenCheckCardNumber: o.wwc, workingWithChildrenCheckExpiry: '2030-01-01', workingwithChildrenCheckCardPhotoImage: 'x' },
    teacherQualificationAvailability: { subjectsChosen: ['Punjabi'], timeSlotsChosen: ['Sunday'], qualification: 'Degree', experience: 'Some' },
    teacherWorkRights: { workRights: 'yes', immigrationStatus: 'Citizen' },
    teacherBankDetails: { bankAccountName: 'Syn Person', BSB: '000000', accountNumber: '00000000', ABN: 'NA' },
    teacherOtherInformation: { otherInfo: 'synthetic' }
});
const register = (o) => call('POST', '/application-teacher/create-applicant', { body: application(o) });
const A = { first: 'Wwcfirst', last: `Wwclast${stamp}`, dob: '1977-07-07', email: `wwc.a.${stamp}@local.test`, wwc: `WWC-INT-${stamp}` };
const first = await register(A);
check('registration of a fresh applicant succeeds', first.status === 200, `${first.status} ${first.json.message ?? ''}`);
const wwcDup = await register({ first: 'Different', last: `Person${stamp}`, dob: '1966-06-06', email: `wwc.b.${stamp}@local.test`, wwc: A.wwc });
check('reused WWC number -> WWC-specific message (not the email message)', wwcDup.status === 409 && /Working With Children Check/.test(wwcDup.json.message) && !/email/i.test(wwcDup.json.message), `${wwcDup.status} ${wwcDup.json.message}`);
const emailDup = await register({ first: 'Another', last: `Person${stamp}`, dob: '1955-05-05', email: A.email.toUpperCase(), wwc: `WWC-INT-2-${stamp}` });
check('reused email (other letter case) -> email-specific message', emailDup.status === 409 && /email is already registered/.test(emailDup.json.message), `${emailDup.status} ${emailDup.json.message}`);
const identityDup = await register({ first: A.first, last: A.last, dob: '1977-07-07T00:00:00+10:00', email: `wwc.c.${stamp}@local.test`, wwc: `WWC-INT-3-${stamp}` });
check('same name + date of birth -> the teacher-duplicate message', identityDup.status === 409 && /A teacher with these details already exists/.test(identityDup.json.message), `${identityDup.status} ${identityDup.json.message}`);
check('the API is still running at the end', await alive());
console.log(`\nSUMMARY ${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
