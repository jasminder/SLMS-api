import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createLoader } from './helpers/load.mjs';
import { addStudent, addTeacher, addUser, createFakeDb } from './helpers/fakeDb.mjs';

process.env.CLIENT_URL = 'https://school.example';
const db = createFakeDb();
globalThis.__TEST_DB__ = db;

const load = createLoader([
    'service/account.status.service/teacher.login.create.service.ts',
    'service/account.status.service/teacher.password.reset.service.ts',
    'controller/admin.controller/admin.teacher.controller/admin.teacher.account.controller.ts',
    'service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts',
    'service/auth.service/auth.service.ts'
]);
const { createTeacherLogin } = await load('service/account.status.service/teacher.login.create.service.ts');
const { sendTeacherPasswordResetEmail } = await load('service/account.status.service/teacher.password.reset.service.ts');
const { getTeacherAccountState } = await load('service/account.status.service/teacher.account.status.service.ts');
const { createTeacherLoginHandler } = await load('controller/admin.controller/admin.teacher.controller/admin.teacher.account.controller.ts');
const { updateTeacherPassword } = await load('service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts');
const { loginUser, existingAuthUser, signUpUser, findUserByResetToken, resetUserPassword } = await load('service/auth.service/auth.service.ts');
const { PENDING_SETUP_PASSWORD } = await load('service/account.status.service/pending.setup.rules.ts');

const URL = 'https://school.example';
const SENTINEL = '!SLMS-PENDING-PASSWORD-SETUP!';
const input = (loginEmail, extra = {}) => ({ loginEmail, confirmLoginEmail: loginEmail, ownershipConfirmed: true, ...extra });

beforeEach(() => {
    db.reset();
    globalThis.__TEST_MAILS__ = [];
    globalThis.__TEST_MAIL_FAIL__ = false;
    globalThis.__TEST_JWT__ = [];
});

const userOf = (email) => db.state.users.find((u) => u.email === email);
const statusOf = async (id) => (await getTeacherAccountState(id)).view;
const snapshot = () => structuredClone(db.state.users);
const tokenFromMail = (mail) => /forgot-password\/([0-9a-f]{64})/.exec(mail.text)?.[1];
const rejectsWith = (promise, statusCode, code) =>
    assert.rejects(promise, (error) => {
        assert.equal(error.statusCode, statusCode, error.message);
        if (code) assert.equal(error.code, code);
        return true;
    });
const fakeResponse = () => ({
    statusCode: undefined,
    body: undefined,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

/* ================================================================== */
describe('Create Teacher Login: success', () => {
    it('creates ONE pending TEACHER login linked by teacherId, on the separate email, and emails a "Set your password" link', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        const result = await createTeacherLogin(30, input('  Teacher30.Login@Example.test '), URL);

        const user = userOf('teacher30.login@example.test'); // trimmed + lowercased
        assert.ok(user, 'the login exists');
        assert.deepEqual([user.role, user.teacherId, user.studentId, user.adminId], ['TEACHER', 30, null, null]);
        assert.equal(user.password, SENTINEL);
        assert.equal(PENDING_SETUP_PASSWORD, SENTINEL);
        assert.ok(!user.password.startsWith('$2'), 'the marker can never be mistaken for a bcrypt hash');
        // No activation flag is touched: the row keeps the creation defaults.
        assert.deepEqual([user.isActive, user.isEmailVerified], [true, false]);
        assert.equal(db.state.users.length, 1);
        // The profile contact email is not changed.
        assert.equal(db.state.details.find((d) => d.teacherId === 30).email, 'family30@example.test');

        assert.equal(globalThis.__TEST_MAILS__.length, 1);
        const mail = globalThis.__TEST_MAILS__[0];
        assert.equal(mail.to, 'teacher30.login@example.test');
        assert.equal(mail.subject, 'Set your password at Akal Shaouni');
        assert.match(mail.text, /set your password/i);
        assert.doesNotMatch(mail.text, /reset your password/i);
        const token = tokenFromMail(mail);
        assert.ok(token, 'the email contains the existing reset-style link');
        assert.match(mail.text, /https:\/\/school\.example\/forgot-password\//);
        assert.equal(user.resetPasswordToken, crypto.createHash('sha256').update(token).digest('hex'));
        assert.ok(user.resetPasswordTokenExpiresAt - Math.floor(Date.now() / 1000) <= 3600, 'the existing one-hour link');

        assert.equal(result.emailSent, true);
        assert.equal(result.loginCreated, true);
        assert.equal(result.sentTo, 'te***@ex***.test');
        assert.doesNotMatch(JSON.stringify(result), /PENDING-PASSWORD-SETUP|teacher30\.login@/);
        assert.equal((await statusOf(30)).status, 'SETUP_PENDING');
    });

    it('creates nothing else: every other login is unchanged', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addStudent(db, { id: 1, email: 'family30@example.test' });
        addUser(db, { id: 11, email: 'family30@example.test', role: 'STUDENT', studentId: 1, password: 'hashed:keep' });
        addUser(db, { id: 12, email: 'someone@example.test', role: 'TEACHER', teacherId: 99, password: 'hashed:keep2' });
        const before = snapshot();
        await createTeacherLogin(30, input('teacher30@example.test'), URL);
        assert.equal(db.state.users.length, before.length + 1);
        assert.deepEqual(db.state.users.slice(0, before.length), before);
    });

    it('the teacher\'s OWN profile email may be used when nobody else uses it', async () => {
        addTeacher(db, { id: 31, email: 'solo31@example.test' });
        await createTeacherLogin(31, input('Solo31@example.test'), URL);
        assert.equal(userOf('solo31@example.test').teacherId, 31);
    });
});

/* ================================================================== */
describe('Create Teacher Login: the admin must confirm and type the email twice', () => {
    for (const confirmed of [false, undefined, 'true', 1, null]) {
        it(`ownershipConfirmed = ${JSON.stringify(confirmed)} -> 400 OWNERSHIP_NOT_CONFIRMED, nothing created or sent`, async () => {
            addTeacher(db, { id: 30, email: 'family30@example.test' });
            await rejectsWith(createTeacherLogin(30, input('t30@example.test', { ownershipConfirmed: confirmed }), URL), 400, 'OWNERSHIP_NOT_CONFIRMED');
            assert.equal(db.state.users.length, 0);
            assert.equal(globalThis.__TEST_MAILS__.length, 0);
        });
    }
    it('the two emails must match (ignoring case/spaces) and be a valid address', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await rejectsWith(createTeacherLogin(30, input('a@example.test', { confirmLoginEmail: 'b@example.test' }), URL), 400, 'LOGIN_EMAIL_INVALID');
        await rejectsWith(createTeacherLogin(30, input('not-an-email'), URL), 400, 'LOGIN_EMAIL_INVALID');
        await rejectsWith(createTeacherLogin(30, input(''), URL), 400, 'LOGIN_EMAIL_INVALID');
        assert.equal(db.state.users.length, 0);
        await createTeacherLogin(30, input('Match@Example.test', { confirmLoginEmail: ' match@example.test ' }), URL);
        assert.equal(db.state.users.length, 1);
    });
});

/* ================================================================== */
describe('Create Teacher Login: teacher eligibility and existing accounts', () => {
    it('refused (409 LOGIN_NOT_AVAILABLE) unless the teacher is approved, active and allowed to log in; unknown teacher 404', async () => {
        addTeacher(db, { id: 1, email: 'a@example.test', role: 'APPLICANT', isActive: false, isAllowedLogin: false });
        addTeacher(db, { id: 2, email: 'b@example.test', isActive: false });
        addTeacher(db, { id: 3, email: 'c@example.test', isAllowedLogin: false });
        for (const id of [1, 2, 3]) await rejectsWith(createTeacherLogin(id, input(`new${id}@example.test`), URL), 409, 'LOGIN_NOT_AVAILABLE');
        await rejectsWith(createTeacherLogin(9999, input('x@example.test'), URL), 404, 'TEACHER_NOT_FOUND');
        assert.equal(db.state.users.length, 0);
        assert.equal(globalThis.__TEST_MAILS__.length, 0);
    });

    it('refused when the teacher already has a login: active, pending, or on a separate email (409 LOGIN_ALREADY_EXISTS); that login is untouched', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addUser(db, { id: 21, email: 'family30@example.test', role: 'TEACHER', teacherId: 30, password: 'hashed:keep' });
        addTeacher(db, { id: 31, email: 'family31@example.test' });
        addUser(db, { id: 22, email: 'login31@example.test', role: 'TEACHER', teacherId: 31, password: SENTINEL });
        const before = snapshot();
        await rejectsWith(createTeacherLogin(30, input('another30@example.test'), URL), 409, 'LOGIN_ALREADY_EXISTS');
        await rejectsWith(createTeacherLogin(31, input('another31@example.test'), URL), 409, 'LOGIN_ALREADY_EXISTS');
        assert.deepEqual(db.state.users, before);
        assert.equal(globalThis.__TEST_MAILS__.length, 0);
    });

    it('refused when an ADMIN or another teacher\'s login already uses the profile email (needs review): nothing is created', async () => {
        addTeacher(db, { id: 46, email: 'boss@example.test' });
        addUser(db, { email: 'boss@example.test', role: 'ADMIN', adminId: 3 });
        await rejectsWith(createTeacherLogin(46, input('new46@example.test'), URL), 409, 'ACCOUNT_CONFLICT');
        assert.equal(db.state.users.length, 1);
    });
});

/* ================================================================== */
describe('Create Teacher Login: email conflicts', () => {
    it('the login email must not already be a login: any role, any letter case (409 LOGIN_EMAIL_IN_USE)', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addUser(db, { email: 'taken@example.test', role: 'STUDENT', studentId: 1 });
        addUser(db, { email: 'taken2@example.test', role: 'ADMIN', adminId: 1 });
        await rejectsWith(createTeacherLogin(30, input('TAKEN@example.test'), URL), 409, 'LOGIN_EMAIL_IN_USE');
        await rejectsWith(createTeacherLogin(30, input('taken2@example.test'), URL), 409, 'LOGIN_EMAIL_IN_USE');
        assert.equal(db.state.users.length, 2);
    });

    it('the login email must not be another person\'s profile email: another teacher, an admin, or any student/family (409 LOGIN_EMAIL_BELONGS_TO_PROFILE)', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addTeacher(db, { id: 31, email: 'colleague@example.test' });
        db.state.adminDetails.push({ adminId: 1, email: 'office@example.test' });
        addStudent(db, { id: 5, email: 'parent@example.test' });
        for (const email of ['Colleague@example.test', 'office@example.test', 'PARENT@example.test']) {
            await rejectsWith(createTeacherLogin(30, input(email), URL), 409, 'LOGIN_EMAIL_BELONGS_TO_PROFILE');
        }
        assert.equal(db.state.users.length, 0);
        assert.equal(globalThis.__TEST_MAILS__.length, 0);
    });

    it('no email is ever sent for a refused request', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addUser(db, { email: 'taken@example.test', role: 'TEACHER', teacherId: 77 });
        await assert.rejects(createTeacherLogin(30, input('taken@example.test'), URL));
        assert.deepEqual(globalThis.__TEST_MAILS__, []);
        assert.ok(db.state.users.every((u) => !u.resetPasswordToken));
    });
});

/* ================================================================== */
describe('the school\'s shared-email cases', () => {
    it('Teacher 86 / Student 5820: the shared family email is refused; a separate email works; the student record and profile email are untouched', async () => {
        addTeacher(db, { id: 86, email: 'rajveer@example.test' });
        addStudent(db, { id: 5820, email: 'rajveer@example.test' });
        await rejectsWith(createTeacherLogin(86, input('rajveer@example.test'), URL), 409, 'LOGIN_EMAIL_BELONGS_TO_PROFILE');
        assert.equal(db.state.users.length, 0);
        await createTeacherLogin(86, input('rajveer.teacher@example.test'), URL);
        assert.equal(userOf('rajveer.teacher@example.test').teacherId, 86);
        assert.equal(db.state.details.find((d) => d.teacherId === 86).email, 'rajveer@example.test');
        assert.equal(db.state.studentDetails.find((d) => d.studentId === 5820).email, 'rajveer@example.test');
        assert.equal(db.state.users.length, 1); // no student login was created
        assert.equal((await statusOf(86)).status, 'SETUP_PENDING');
    });

    it('Teacher 79 / Student 5654: same', async () => {
        addTeacher(db, { id: 79, email: 'family79@example.test' });
        addStudent(db, { id: 5654, email: 'family79@example.test' });
        await rejectsWith(createTeacherLogin(79, input('family79@example.test'), URL), 409, 'LOGIN_EMAIL_BELONGS_TO_PROFILE');
        await createTeacherLogin(79, input('teacher79@example.test'), URL);
        assert.deepEqual(db.state.users.map((u) => [u.email, u.role, u.teacherId]), [['teacher79@example.test', 'TEACHER', 79]]);
    });

    it('Teacher 50 / Student 5445: the STUDENT login stays byte-for-byte unchanged; the teacher gets a separate login', async () => {
        addTeacher(db, { id: 50, email: 'mum@example.test' });
        addStudent(db, { id: 5445, email: 'mum@example.test' });
        addUser(db, { id: 4500, email: 'mum@example.test', role: 'STUDENT', studentId: 5445, password: 'hashed:family-secret' });
        const studentLoginBefore = structuredClone(userOf('mum@example.test'));
        assert.equal((await statusOf(50)).status, 'NO_ACCOUNT');
        await rejectsWith(createTeacherLogin(50, input('mum@example.test'), URL), 409, 'LOGIN_EMAIL_IN_USE');
        await createTeacherLogin(50, input('teacher50@example.test'), URL);
        assert.deepEqual(userOf('mum@example.test'), studentLoginBefore);
        assert.equal(userOf('teacher50@example.test').teacherId, 50);
        assert.equal((await statusOf(50)).status, 'SETUP_PENDING');
    });

    it('Teacher 23 / Student 5558: the existing TEACHER login is unchanged and no second login is created', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep@example.test' });
        addStudent(db, { id: 5558, email: 'kirandeep@example.test' });
        addUser(db, { id: 2300, email: 'kirandeep@example.test', role: 'TEACHER', teacherId: 23, password: 'hashed:keep' });
        const before = structuredClone(userOf('kirandeep@example.test'));
        await rejectsWith(createTeacherLogin(23, input('kirandeep.second@example.test'), URL), 409, 'LOGIN_ALREADY_EXISTS');
        assert.deepEqual(userOf('kirandeep@example.test'), before);
        assert.equal(db.state.users.length, 1);
        assert.equal((await statusOf(23)).status, 'ACTIVE');
    });
});

/* ================================================================== */
describe('failed email delivery and resend', () => {
    it('keeps the pending account, says so clearly, never claims the email was sent, and the token is removed', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        globalThis.__TEST_MAIL_FAIL__ = true;
        await assert.rejects(createTeacherLogin(30, input('t30@example.test'), URL), (error) => {
            assert.equal(error.statusCode, 503);
            assert.equal(error.code, 'SETUP_EMAIL_NOT_SENT');
            assert.match(error.message, /created/);
            assert.match(error.message, /could NOT be sent/);
            assert.match(error.message, /Resend/);
            assert.doesNotMatch(error.message, /was sent|has been sent/);
            return true;
        });
        const user = userOf('t30@example.test');
        assert.ok(user, 'the pending login was kept');
        assert.equal(user.password, SENTINEL);
        assert.equal(user.resetPasswordToken, null);
        assert.deepEqual(globalThis.__TEST_MAILS__, []);
        assert.equal((await statusOf(30)).status, 'SETUP_PENDING');
        // The pending account still cannot be used.
        await rejectsWith(loginUser('t30@example.test', SENTINEL), 403);
    });

    it('the admin can resend: the same account gets a fresh link with the "Set your password" wording; still pending', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        globalThis.__TEST_MAIL_FAIL__ = true;
        await assert.rejects(createTeacherLogin(30, input('t30@example.test'), URL));
        globalThis.__TEST_MAIL_FAIL__ = false;
        const result = await sendTeacherPasswordResetEmail(30, URL);
        assert.equal(result.message, 'Set-your-password email sent');
        assert.equal(globalThis.__TEST_MAILS__.length, 1);
        assert.equal(globalThis.__TEST_MAILS__[0].subject, 'Set your password at Akal Shaouni');
        assert.equal(globalThis.__TEST_MAILS__[0].to, 't30@example.test');
        assert.equal(db.state.users.length, 1);
        assert.equal(userOf('t30@example.test').password, SENTINEL);
        assert.equal((await statusOf(30)).status, 'SETUP_PENDING');
    });

    it('resending replaces the old link: only the newest works', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await createTeacherLogin(30, input('t30@example.test'), URL);
        await sendTeacherPasswordResetEmail(30, URL);
        const [first, second] = globalThis.__TEST_MAILS__.map(tokenFromMail);
        assert.notEqual(first, second);
        assert.deepEqual(await findUserByResetToken(first), { user: null, expired: false });
        assert.equal((await findUserByResetToken(second)).user.email, 't30@example.test');
    });

    it('the normal reset email keeps its own wording for an ACTIVE account', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30, password: 'hashed:old' });
        await sendTeacherPasswordResetEmail(30, URL);
        assert.equal(globalThis.__TEST_MAILS__[0].subject, 'Reset your Password at Akal Shaouni');
        assert.match(globalThis.__TEST_MAILS__[0].text, /^We have received a request to reset your password/);
    });
});

/* ================================================================== */
describe('setup wording (Bug 3): "setup email" for new accounts, "reset email" for normal resets', () => {
    it('a failed RESEND for a pending account says "setup email", never "reset email"', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await createTeacherLogin(30, input('t30@example.test'), URL);
        globalThis.__TEST_MAIL_FAIL__ = true;
        await assert.rejects(sendTeacherPasswordResetEmail(30, URL), (error) => {
            assert.equal(error.statusCode, 503);
            assert.equal(error.code, 'EMAIL_NOT_SENT');
            assert.match(error.message, /could not send the setup email/);
            assert.doesNotMatch(error.message, /reset email/);
            return true;
        });
        assert.equal(userOf('t30@example.test').resetPasswordToken, null);
    });

    it('a failed normal reset for an ACTIVE account still says "reset email"', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30, password: 'hashed:old' });
        globalThis.__TEST_MAIL_FAIL__ = true;
        await assert.rejects(sendTeacherPasswordResetEmail(30, URL), (error) => {
            assert.match(error.message, /could not send the reset email/);
            return true;
        });
    });

    it('the setup link carries ?setup=1 (so the page can say "Set Your Password"); the normal reset link does not', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await createTeacherLogin(30, input('t30@example.test'), URL);
        addTeacher(db, { id: 31, email: 'teacher31@example.test' });
        addUser(db, { email: 'teacher31@example.test', role: 'TEACHER', teacherId: 31, password: 'hashed:old' });
        await sendTeacherPasswordResetEmail(31, URL);
        const [setup, reset] = globalThis.__TEST_MAILS__;
        assert.match(setup.text, /\/forgot-password\/[0-9a-f]{64}\?setup=1 /);
        assert.doesNotMatch(reset.text, /setup=1/);
        assert.match(reset.text, /\/forgot-password\/[0-9a-f]{64} /);
        // the marker is display-only: the token in a setup link is checked exactly like any other
        const token = tokenFromMail(setup);
        assert.equal((await findUserByResetToken(token)).user.email, 't30@example.test');
    });
});

/* ================================================================== */
describe('concurrent creation', () => {
    it('five simultaneous requests for the SAME teacher create exactly one login and send exactly one email', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        const results = await Promise.allSettled([1, 2, 3, 4, 5].map((n) => createTeacherLogin(30, input(`t30.${n}@example.test`), URL)));
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        for (const r of results.filter((r) => r.status === 'rejected')) assert.equal(r.reason.code, 'LOGIN_ALREADY_EXISTS');
        assert.equal(db.state.users.length, 1);
        assert.equal(globalThis.__TEST_MAILS__.length, 1);
        assert.ok(db.lockLog.length >= 10, 'advisory locks were taken (teacher + email, per request)');
    });

    it('two teachers racing for the SAME login email: one wins, the other is told the email is in use', async () => {
        addTeacher(db, { id: 30, email: 'a30@example.test' });
        addTeacher(db, { id: 31, email: 'a31@example.test' });
        const results = await Promise.allSettled([createTeacherLogin(30, input('shared.login@example.test'), URL), createTeacherLogin(31, input('Shared.Login@example.test'), URL)]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'LOGIN_EMAIL_IN_USE');
        assert.equal(db.state.users.length, 1);
    });

    it('independent teachers with different emails are not blocked by each other', async () => {
        addTeacher(db, { id: 30, email: 'a30@example.test' });
        addTeacher(db, { id: 31, email: 'a31@example.test' });
        const results = await Promise.allSettled([createTeacherLogin(30, input('x30@example.test'), URL), createTeacherLogin(31, input('x31@example.test'), URL)]);
        assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'fulfilled']);
        assert.equal(db.state.users.length, 2);
    });

    it('even with the advisory locks disabled the unique index backstop turns a lost race into LOGIN_ALREADY_EXISTS (never a second login)', async () => {
        db.setLocks(false);
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        const results = await Promise.allSettled([createTeacherLogin(30, input('p.one@example.test'), URL), createTeacherLogin(30, input('p.two@example.test'), URL)]);
        assert.ok(db.state.users.length <= 1, 'never two logins for one teacher');
        for (const r of results.filter((x) => x.status === 'rejected')) assert.equal(r.reason.code, 'LOGIN_ALREADY_EXISTS');
    });
});

/* ================================================================== */
describe('a pending login can NOT authenticate by any existing path', () => {
    const makePending = async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await createTeacherLogin(30, input('t30@example.test'), URL);
        globalThis.__TEST_JWT__ = [];
    };

    it('loginUser: rejected with 403 BEFORE any password check, for any password, including the marker text itself; no token issued', async () => {
        await makePending();
        for (const attempt of ['anything', '', SENTINEL, 'hashed:' + SENTINEL, 'T30@EXAMPLE.TEST']) {
            await rejectsWith(loginUser('t30@example.test', attempt), 403);
        }
        await rejectsWith(loginUser('T30@Example.test', 'anything'), 403); // email case does not matter
        assert.equal(globalThis.__TEST_JWT__.length, 0, 'no session token was ever signed');
    });

    it('existingAuthUser (used by protectRoute session restoration AND by the refresh handler): rejected, even with a token minted earlier', async () => {
        await makePending();
        await rejectsWith(existingAuthUser('t30@example.test', 'TEACHER'), 403);
        await rejectsWith(existingAuthUser('T30@example.test', 'ADMIN'), 403); // the role claim in an old token makes no difference
    });

    it('signUpUser: cannot take over the pending email (already exists); a case variant creates nothing either', async () => {
        await makePending();
        await rejectsWith(signUpUser('t30@example.test', 'Brand-new1!', 'Brand-new1!'), 400);
        await assert.rejects(signUpUser('T30@Example.test', 'Brand-new1!', 'Brand-new1!'));
        assert.equal(db.state.users.length, 1);
        assert.equal(userOf('t30@example.test').password, SENTINEL);
        assert.equal(globalThis.__TEST_JWT__.length, 0);
    });

    it('the admin Change Password cannot set a password around the teacher; the marker survives', async () => {
        await makePending();
        await rejectsWith(updateTeacherPassword('30', 'NewPassw0rd!', 'NewPassw0rd!'), 409, 'SETUP_PENDING');
        assert.equal(userOf('t30@example.test').password, SENTINEL);
    });

    it('static check: session tokens are only signed in the signup/login code and the refresh handler, and both refresh and protectRoute go through existingAuthUser', () => {
        const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
        const signers = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.name.endsWith('.ts') && /jwt\.sign\(/.test(fs.readFileSync(full, 'utf8'))) signers.push(path.relative(root, full));
            }
        };
        walk(root);
        assert.deepEqual(signers.sort(), ['controller/auth.controller/auth.controller.ts', 'service/auth.service/auth.service.ts']);
        const controller = fs.readFileSync(path.join(root, 'controller/auth.controller/auth.controller.ts'), 'utf8');
        assert.match(controller.slice(controller.indexOf('export const refreshHandler =')), /existingAuthUser\(decodedRefreshToken\.email/);
        assert.match(fs.readFileSync(path.join(root, 'middleware/protectRoutes.ts'), 'utf8'), /existingAuthUser\(decodedToken\.email/);
        // Password reset never issues a session.
        const reset = controller.slice(controller.indexOf('export const resetPasswordHandler'));
        assert.doesNotMatch(reset.slice(0, reset.indexOf('\n};')), /jwt\.sign|accessToken|refreshToken/);
    });
});

/* ================================================================== */
describe('completing the emailed setup', () => {
    const createAndGetToken = async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        await createTeacherLogin(30, input('t30@example.test'), URL);
        return tokenFromMail(globalThis.__TEST_MAILS__[0]);
    };

    it('the link replaces the marker with a real password hash, clears the token, changes no flag, and the teacher can then log in', async () => {
        const token = await createAndGetToken();
        const found = await findUserByResetToken(token);
        assert.equal(found.expired, false);
        assert.equal(found.user.email, 't30@example.test');
        await resetUserPassword(found.user.email, 'My-new-Passw0rd');

        const user = userOf('t30@example.test');
        assert.equal(user.password, 'hashed:My-new-Passw0rd');
        assert.notEqual(user.password, SENTINEL);
        assert.equal(user.resetPasswordToken, null);
        assert.equal(user.resetPasswordTokenExpiresAt, null);
        assert.deepEqual([user.isActive, user.isEmailVerified], [true, false]); // no activation flag changed
        const view = await statusOf(30);
        assert.equal(view.status, 'ACTIVE');
        assert.deepEqual([view.canChangePassword, view.canSendResetEmail], [true, true]);

        const login = await loginUser('t30@example.test', 'My-new-Passw0rd');
        assert.equal(login.loggedInUser.role, 'TEACHER');
        assert.ok(login.accessToken);
        await rejectsWith(loginUser('t30@example.test', 'wrong'), 401);
        await existingAuthUser('t30@example.test', 'TEACHER'); // session restoration now works
    });

    it('a used link cannot be used again; an unknown link is invalid', async () => {
        const token = await createAndGetToken();
        await resetUserPassword('t30@example.test', 'My-new-Passw0rd');
        assert.deepEqual(await findUserByResetToken(token), { user: null, expired: false });
        assert.deepEqual(await findUserByResetToken('f'.repeat(64)), { user: null, expired: false });
    });

    it('an expired link is reported as expired; the account stays pending and unusable, and a resend fixes it', async () => {
        const token = await createAndGetToken();
        userOf('t30@example.test').resetPasswordTokenExpiresAt = Math.floor(Date.now() / 1000) - 5;
        assert.deepEqual(await findUserByResetToken(token), { user: null, expired: true });
        assert.equal(userOf('t30@example.test').password, SENTINEL);
        await rejectsWith(loginUser('t30@example.test', 'anything'), 403);
        await sendTeacherPasswordResetEmail(30, URL);
        const fresh = tokenFromMail(globalThis.__TEST_MAILS__[1]);
        assert.equal((await findUserByResetToken(fresh)).expired, false);
    });
});

/* ================================================================== */
describe('existing logins keep working exactly as before', () => {
    it('active teacher, student and admin logins still work; a wrong password is still 401', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep@example.test' });
        addUser(db, { email: 'kirandeep@example.test', role: 'TEACHER', teacherId: 23, password: 'hashed:teacher-pass' });
        addStudent(db, { id: 5, email: 'parent@example.test' });
        addUser(db, { email: 'parent@example.test', role: 'STUDENT', studentId: 5, password: 'hashed:parent-pass' });
        db.state.admins.push({ id: 1, isAllowedLogin: true, isActive: true });
        addUser(db, { email: 'office@example.test', role: 'ADMIN', adminId: 1, password: 'hashed:admin-pass' });
        assert.equal((await loginUser('kirandeep@example.test', 'teacher-pass')).loggedInUser.role, 'TEACHER');
        assert.equal((await loginUser('parent@example.test', 'parent-pass')).loggedInUser.role, 'STUDENT');
        assert.equal((await loginUser('office@example.test', 'admin-pass')).loggedInUser.role, 'ADMIN');
        await rejectsWith(loginUser('kirandeep@example.test', 'nope'), 401);
        await rejectsWith(loginUser('nobody@example.test', 'x'), 404);
    });

    it('only the EXACT marker is pending: a legacy non-hash password gets the normal "Invalid password" (401), not the pending message', async () => {
        addTeacher(db, { id: 24, email: 'legacy@example.test' });
        addUser(db, { email: 'legacy@example.test', role: 'TEACHER', teacherId: 24, password: 'legacy-plain-text' });
        await rejectsWith(loginUser('legacy@example.test', 'anything'), 401);
        addTeacher(db, { id: 25, email: 'near@example.test' });
        addUser(db, { email: 'near@example.test', role: 'TEACHER', teacherId: 25, password: SENTINEL + 'x' });
        await rejectsWith(loginUser('near@example.test', 'anything'), 401);
    });

    it('existingAuthUser returns the same user shape as before, without the password', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep@example.test' });
        addUser(db, { id: 7, email: 'kirandeep@example.test', role: 'TEACHER', teacherId: 23, password: 'hashed:teacher-pass' });
        const user = await existingAuthUser('Kirandeep@example.test', 'TEACHER');
        assert.equal(user.id, 7);
        assert.equal(user.role, 'TEACHER');
        assert.equal('password' in user, false);
    });

    it('forgot-password machinery for an active user is unchanged: a token is issued and the reset sets the new hash', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep@example.test' });
        addUser(db, { email: 'kirandeep@example.test', role: 'TEACHER', teacherId: 23, password: 'hashed:old' });
        await sendTeacherPasswordResetEmail(23, URL);
        const token = tokenFromMail(globalThis.__TEST_MAILS__[0]);
        const found = await findUserByResetToken(token);
        await resetUserPassword(found.user.email, 'Another-Passw0rd');
        assert.equal(userOf('kirandeep@example.test').password, 'hashed:Another-Passw0rd');
    });
});

/* ================================================================== */
describe('controller, route protection and response contents', () => {
    const req = (id, body, extra = {}) => ({ params: { id }, body, user: { id: 1 }, get: () => undefined, protocol: 'https', ...extra });

    it('201 on success; 409/400/503 with a stable code otherwise; the response never contains the marker or a full address', async () => {
        addTeacher(db, { id: 30, email: 'family30@example.test' });
        addTeacher(db, { id: 31, email: 'family31@example.test' });
        let res = fakeResponse();
        await createTeacherLoginHandler(req('30', input('t30@example.test')), res, (e) => assert.fail(e));
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.emailSent, true);
        assert.doesNotMatch(JSON.stringify(res.body), /PENDING-PASSWORD-SETUP|t30@example\.test/);

        res = fakeResponse();
        await createTeacherLoginHandler(req('30', input('again@example.test')), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [409, 'LOGIN_ALREADY_EXISTS']);

        res = fakeResponse();
        await createTeacherLoginHandler(req('31', input('t31@example.test', { ownershipConfirmed: false })), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [400, 'OWNERSHIP_NOT_CONFIRMED']);

        res = fakeResponse();
        await createTeacherLoginHandler(req('31'), res, (e) => assert.fail(e)); // no body at all
        assert.equal(res.statusCode, 400);

        globalThis.__TEST_MAIL_FAIL__ = true;
        res = fakeResponse();
        await createTeacherLoginHandler(req('31', input('t31@example.test')), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [503, 'SETUP_EMAIL_NOT_SENT']);
        assert.doesNotMatch(JSON.stringify(res.body), /PENDING-PASSWORD-SETUP|t31@example\.test/);
        assert.equal(res.body.emailSent, undefined);
        assert.equal(userOf('t31@example.test').password, SENTINEL);
    });

    it('static check: the route is POST /create-login/:id behind protectRoute then restrict(\'ADMIN\'), and the body requires ownershipConfirmed === true', () => {
        const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
        const route = fs.readFileSync(path.join(root, 'route/admin.route/admin.teacher.route/admin.teacher.route/admin.teacher.route.ts'), 'utf8');
        assert.match(route, /route\('\/create-login\/:id'\)\.post\(validate\(createTeacherLoginSchema\), protectRoute, restrict\('ADMIN'\), asyncErrorHandler\(createTeacherLoginHandler\)\)/);
        const dto = fs.readFileSync(path.join(root, 'schema/admin.dto/admin.teacher.dto/admin.teacher.dto.ts'), 'utf8');
        assert.match(dto, /ownershipConfirmed: z\.literal\(true/);
        assert.match(dto, /confirmLoginEmail/);
    });
});
