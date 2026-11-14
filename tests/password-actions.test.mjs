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
    'service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts',
    'controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller.ts',
    'service/account.status.service/teacher.password.reset.service.ts',
    'controller/admin.controller/admin.teacher.controller/admin.teacher.account.controller.ts',
    'service/admin.service/admin.student.service/admin.student.update.service/admin.student.update.service.ts',
    'controller/admin.controller/admin.student.controller/admin.student.update.controller/admin.student.update.controller.ts'
]);
const { updateTeacherPassword } = await load('service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts');
const { updateTeacherPasswordHandler } = await load('controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller.ts');
const { sendTeacherPasswordResetEmail } = await load('service/account.status.service/teacher.password.reset.service.ts');
const { getTeacherAccountStatusHandler, sendTeacherPasswordResetHandler } = await load('controller/admin.controller/admin.teacher.controller/admin.teacher.account.controller.ts');
const { updateStudentPassword } = await load('service/admin.service/admin.student.service/admin.student.update.service/admin.student.update.service.ts');
const { updateStudentPasswordHandler } = await load('controller/admin.controller/admin.student.controller/admin.student.update.controller/admin.student.update.controller.ts');

const NEW = 'NewPassw0rd!';
const hashed = `hashed:${NEW}`;

beforeEach(() => {
    db.reset();
    globalThis.__TEST_MAILS__ = [];
    globalThis.__TEST_MAIL_FAIL__ = false;
});

const userOf = (email) => db.state.users.find((u) => u.email === email);
const passwords = () => Object.fromEntries(db.state.users.map((u) => [u.email, u.password]));
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
const rejectsWith = (promise, statusCode, code) =>
    assert.rejects(promise, (error) => {
        assert.equal(error.statusCode, statusCode);
        if (code) assert.equal(error.code, code);
        return true;
    });

/* ================================================================== */
describe('TEACHER Change Password', () => {
    it('changes ONLY the password of the login linked to that teacher', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addTeacher(db, { id: 31, email: 'teacher31@example.test' });
        addStudent(db, { id: 5445, email: 'parent@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        addUser(db, { email: 'teacher31@example.test', role: 'TEACHER', teacherId: 31 });
        addUser(db, { email: 'parent@example.test', role: 'STUDENT', studentId: 5445 });
        await updateTeacherPassword('30', NEW, NEW);
        assert.deepEqual(passwords(), { 'teacher30@example.test': hashed, 'teacher31@example.test': 'x', 'parent@example.test': 'x' });
    });

    it('NEVER creates a login: a teacher with no account gets a clear "no account" error and nothing is created', async () => {
        addTeacher(db, { id: 31, email: 'teacher31@example.test' });
        await rejectsWith(updateTeacherPassword('31', NEW, NEW), 404, 'NO_ACCOUNT');
        assert.equal(db.state.users.length, 0);
    });

    it('a shared email never changes another person\'s password (Teacher 50 / Student 5445: the STUDENT login is untouched)', async () => {
        addTeacher(db, { id: 50, email: 'mum@example.test' });
        addStudent(db, { id: 5445, email: 'mum@example.test' });
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 5445 });
        await rejectsWith(updateTeacherPassword('50', NEW, NEW), 404, 'NO_ACCOUNT'); // the teacher has no login of their own
        assert.deepEqual(passwords(), { 'mum@example.test': 'x' });
        assert.equal(db.state.users.length, 1);
    });

    it('a login on the email that is linked to ANOTHER teacher is not changed either', async () => {
        addTeacher(db, { id: 40, email: 'dup@example.test' });
        addTeacher(db, { id: 41, email: 'other@example.test' });
        addUser(db, { email: 'dup@example.test', role: 'TEACHER', teacherId: 41 });
        await rejectsWith(updateTeacherPassword('40', NEW, NEW), 409, 'ACCOUNT_CONFLICT');
        assert.deepEqual(passwords(), { 'dup@example.test': 'x' });
    });

    it('a deliberately separate login email is NOT an error: only the linked login changes, the profile/student emails do not', async () => {
        addTeacher(db, { id: 32, email: 'family@example.test' });
        addStudent(db, { id: 5820, email: 'family@example.test' });
        addUser(db, { email: 'teacher.login@example.test', role: 'TEACHER', teacherId: 32 });
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 5820 });
        await updateTeacherPassword('32', NEW, NEW);
        assert.deepEqual(passwords(), { 'teacher.login@example.test': hashed, 'family@example.test': 'x' });
    });

    it('SETUP PENDING: an admin cannot set a password around the teacher (409 SETUP_PENDING); the marker is untouched', async () => {
        addTeacher(db, { id: 37, email: 'family37@example.test' });
        addUser(db, { email: 'login37@example.test', role: 'TEACHER', teacherId: 37, password: '!SLMS-PENDING-PASSWORD-SETUP!' });
        await rejectsWith(updateTeacherPassword('37', NEW, NEW), 409, 'SETUP_PENDING');
        assert.equal(userOf('login37@example.test').password, '!SLMS-PENDING-PASSWORD-SETUP!');
    });

    it('inactive / not approved / login not enabled / deactivated login -> refused (409), nothing changed', async () => {
        addTeacher(db, { id: 33, email: 'a@example.test', isActive: false });
        addUser(db, { email: 'a@example.test', role: 'TEACHER', teacherId: 33 });
        addTeacher(db, { id: 34, email: 'b@example.test', isAllowedLogin: false });
        addUser(db, { email: 'b@example.test', role: 'TEACHER', teacherId: 34 });
        addTeacher(db, { id: 35, email: 'c@example.test' });
        addUser(db, { email: 'c@example.test', role: 'TEACHER', teacherId: 35, isActive: false });
        for (const id of ['33', '34', '35']) await rejectsWith(updateTeacherPassword(id, NEW, NEW), 409, 'LOGIN_NOT_AVAILABLE');
        assert.deepEqual(passwords(), { 'a@example.test': 'x', 'b@example.test': 'x', 'c@example.test': 'x' });
    });

    it('mismatched confirmation is rejected first; unknown teacher -> 404', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        await rejectsWith(updateTeacherPassword('30', NEW, 'different'), 400);
        assert.equal(passwords()['teacher30@example.test'], 'x');
        await rejectsWith(updateTeacherPassword('9999', NEW, NEW), 404, 'TEACHER_NOT_FOUND');
    });

    it('controller: 200 on success; 404/409 with a stable code and clear message otherwise; 400 for mismatched confirmation', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        addTeacher(db, { id: 31, email: 'teacher31@example.test' });
        addTeacher(db, { id: 50, email: 'mum@example.test' });
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 1 });
        const run = async (id, body) => {
            const res = fakeResponse();
            await updateTeacherPasswordHandler({ params: { id }, body, user: { id: 1 } }, res);
            return res;
        };
        assert.equal((await run('30', { newPassword: NEW, confirmPassword: NEW })).statusCode, 200);
        const none = await run('31', { newPassword: NEW, confirmPassword: NEW });
        assert.deepEqual([none.statusCode, none.body.code], [404, 'NO_ACCOUNT']);
        assert.match(none.body.message, /no login account yet/);
        const conflict = await run('50', { newPassword: NEW, confirmPassword: NEW });
        assert.deepEqual([conflict.statusCode, conflict.body.code], [404, 'NO_ACCOUNT']);
        const mismatch = await run('30', { newPassword: NEW, confirmPassword: 'nope' });
        assert.deepEqual([mismatch.statusCode, mismatch.body.message], [400, 'Passwords do not match']);
    });
});

/* ================================================================== */
describe('TEACHER Send Password Reset Email (mail is stubbed: nothing real is ever sent)', () => {
    it('ACTIVE: sends ONE email to the linked login\'s own address with a link whose token matches the stored hash', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        const result = await sendTeacherPasswordResetEmail(30, 'https://school.example');
        assert.equal(result.message, 'Password reset email sent');
        assert.equal(result.sentTo, 'te***@ex***.test'); // masked, never the full address
        assert.equal(globalThis.__TEST_MAILS__.length, 1);
        const mail = globalThis.__TEST_MAILS__[0];
        assert.equal(mail.to, 'teacher30@example.test');
        const token = /forgot-password\/([0-9a-f]{64})/.exec(mail.text)?.[1];
        assert.ok(token, 'the email contains a reset link');
        assert.equal(userOf('teacher30@example.test').resetPasswordToken, crypto.createHash('sha256').update(token).digest('hex'));
        assert.ok(userOf('teacher30@example.test').resetPasswordTokenExpiresAt > Math.floor(Date.now() / 1000));
    });

    it('REFUSES, sending nothing and storing no token, for: no account, a student login on the email, another teacher\'s login, ineligible teacher', async () => {
        addTeacher(db, { id: 31, email: 'noaccount@example.test' }); // no account
        addTeacher(db, { id: 50, email: 'mum@example.test' }); // STUDENT login on the email, no teacher login
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 5445 });
        addTeacher(db, { id: 40, email: 'dup@example.test' }); // the login on the email belongs to ANOTHER teacher
        addUser(db, { email: 'dup@example.test', role: 'TEACHER', teacherId: 41 });
        addTeacher(db, { id: 33, email: 'inactive@example.test', isActive: false }); // ineligible
        addUser(db, { email: 'inactive@example.test', role: 'TEACHER', teacherId: 33 });
        const expected = { 31: [404, 'NO_ACCOUNT'], 50: [404, 'NO_ACCOUNT'], 40: [409, 'ACCOUNT_CONFLICT'], 33: [409, 'LOGIN_NOT_AVAILABLE'] };
        for (const [id, [status, code]] of Object.entries(expected)) await rejectsWith(sendTeacherPasswordResetEmail(+id, 'https://school.example'), status, code);
        assert.equal(globalThis.__TEST_MAILS__.length, 0);
        assert.ok(db.state.users.every((u) => !u.resetPasswordToken), 'no reset token was stored on any login');
        assert.equal(db.state.users.length, 3); // the three seeded logins only: none was created
    });

    it('with a separate login email the reset goes ONLY to the login\'s own address, never to the shared profile/family address', async () => {
        addTeacher(db, { id: 32, email: 'family@example.test' });
        addStudent(db, { id: 5820, email: 'family@example.test' });
        addUser(db, { email: 'teacher.login@example.test', role: 'TEACHER', teacherId: 32 });
        const result = await sendTeacherPasswordResetEmail(32, 'https://school.example');
        assert.equal(result.message, 'Password reset email sent'); // active account: the normal reset wording is kept
        assert.deepEqual(globalThis.__TEST_MAILS__.map((m) => m.to), ['teacher.login@example.test']);
        assert.match(globalThis.__TEST_MAILS__[0].subject, /^Reset your Password/);
    });

    it('if the mail relay refuses, the stored token is removed again and the admin gets a clear error', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        globalThis.__TEST_MAIL_FAIL__ = true;
        await rejectsWith(sendTeacherPasswordResetEmail(30, 'https://school.example'), 503, 'EMAIL_NOT_SENT');
        assert.equal(userOf('teacher30@example.test').resetPasswordToken, null);
    });

    it('unknown teacher -> 404', async () => {
        await rejectsWith(sendTeacherPasswordResetEmail(9999, 'https://school.example'), 404, 'TEACHER_NOT_FOUND');
    });

    it('controllers: status 200/404 and reset 200/409/404; the link uses the configured client URL', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        addTeacher(db, { id: 50, email: 'mum@example.test' });
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 5445 });
        addTeacher(db, { id: 40, email: 'dup@example.test' });
        addUser(db, { email: 'dup@example.test', role: 'TEACHER', teacherId: 41 });
        const req = (id) => ({ params: { id }, user: { id: 1 }, get: () => undefined, protocol: 'https' });
        let res = fakeResponse();
        await getTeacherAccountStatusHandler(req('30'), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.status], [200, 'ACTIVE']);
        res = fakeResponse();
        await getTeacherAccountStatusHandler(req('9999'), res, (e) => assert.fail(e));
        assert.equal(res.statusCode, 404);
        res = fakeResponse();
        await sendTeacherPasswordResetHandler(req('30'), res, (e) => assert.fail(e));
        assert.equal(res.statusCode, 200);
        assert.match(globalThis.__TEST_MAILS__[0].text, /^We have received .* https:\/\/school\.example\/forgot-password\//);
        res = fakeResponse();
        await sendTeacherPasswordResetHandler(req('50'), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [404, 'NO_ACCOUNT']);
        res = fakeResponse();
        await sendTeacherPasswordResetHandler(req('40'), res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [409, 'ACCOUNT_CONFLICT']);
        assert.equal(globalThis.__TEST_MAILS__.length, 1); // only the first one was sent
    });
});

/* ================================================================== */
describe('STUDENT Change Password (no unsafe or wrong-role account creation)', () => {
    it('a linked STUDENT login: only that login\'s password changes', async () => {
        addStudent(db, { id: 5100, email: 'fam@example.test' });
        addUser(db, { email: 'fam@example.test', role: 'STUDENT', studentId: 5100 });
        addUser(db, { email: 'other@example.test', role: 'STUDENT', studentId: 5200 });
        await updateStudentPassword('5100', NEW, NEW);
        assert.deepEqual(passwords(), { 'fam@example.test': hashed, 'other@example.test': 'x' });
    });

    it('a linked login with the wrong role is reported, not changed', async () => {
        addStudent(db, { id: 5100, email: 'fam@example.test' });
        addUser(db, { email: 'fam@example.test', role: 'TEACHER', studentId: 5100 });
        await rejectsWith(updateStudentPassword('5100', NEW, NEW), 409, 'ACCOUNT_CONFLICT');
        assert.equal(userOf('fam@example.test').password, 'x');
    });

    it('creates a login ONLY under strict conditions, always with role STUDENT linked to that student', async () => {
        addStudent(db, { id: 5100, email: 'New.Family@Example.test' });
        await updateStudentPassword('5100', NEW, NEW);
        const created = userOf('new.family@example.test');
        assert.deepEqual([created.role, created.studentId, created.password], ['STUDENT', 5100, hashed]);
    });

    it('does NOT create a login for an alumni / applicant / inactive student (previously it created one with the student\'s own role)', async () => {
        addStudent(db, { id: 5101, email: 'alumni@example.test', role: 'ALUMNI', isActive: false });
        addStudent(db, { id: 5102, email: 'applicant@example.test', role: 'APPLICANT', isActive: false, isAllowedLogin: false });
        addStudent(db, { id: 5103, email: 'inactive@example.test', isActive: false });
        addStudent(db, { id: 5104, email: 'nologin@example.test', isAllowedLogin: false });
        for (const id of ['5101', '5102', '5103', '5104']) await rejectsWith(updateStudentPassword(id, NEW, NEW), 409, 'NOT_ELIGIBLE');
        assert.equal(db.state.users.length, 0);
    });

    it('a TEACHER login on the student\'s email is not touched and no student login is created', async () => {
        addStudent(db, { id: 5100, email: 'shared@example.test' });
        addUser(db, { email: 'shared@example.test', role: 'TEACHER', teacherId: 23 });
        await rejectsWith(updateStudentPassword('5100', NEW, NEW), 409, 'ACCOUNT_CONFLICT');
        assert.deepEqual(passwords(), { 'shared@example.test': 'x' });
    });

    it('a sibling\'s family login on the same email is not changed (this used to be an unexplained 500)', async () => {
        addStudent(db, { id: 5100, email: 'family@example.test' });
        addStudent(db, { id: 5101, email: 'family@example.test' });
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 5101 });
        await rejectsWith(updateStudentPassword('5100', NEW, NEW), 409, 'ACCOUNT_CONFLICT');
        assert.equal(userOf('family@example.test').password, 'x');
        assert.equal(db.state.users.length, 1);
    });

    it('Teacher 86 / Student 5820: shared eligible email, no logins -> refused as ambiguous, nothing created', async () => {
        addTeacher(db, { id: 86, email: 'rajveer@example.test' });
        addStudent(db, { id: 5820, email: 'rajveer@example.test' });
        await rejectsWith(updateStudentPassword('5820', NEW, NEW), 409, 'AMBIGUOUS_EMAIL');
        assert.equal(db.state.users.length, 0);
    });

    it('a student with no email, an unknown student, and a creation race all give clear errors', async () => {
        addStudent(db, { id: 5100, email: '' });
        await rejectsWith(updateStudentPassword('5100', NEW, NEW), 400, 'NO_EMAIL');
        await rejectsWith(updateStudentPassword('9999', NEW, NEW), 404, 'STUDENT_NOT_FOUND');
        addStudent(db, { id: 5105, email: 'race@example.test' });
        db.hooks.userCreate = async () => {
            throw Object.assign(new Error('unique'), { code: 'P2002' });
        };
        await rejectsWith(updateStudentPassword('5105', NEW, NEW), 409, 'ACCOUNT_CONFLICT');
    });

    it('controller returns the stable code and message (not a generic 500)', async () => {
        addStudent(db, { id: 5101, email: 'alumni@example.test', role: 'ALUMNI', isActive: false });
        const res = fakeResponse();
        await updateStudentPasswordHandler({ params: { id: '5101' }, body: { newPassword: NEW, confirmPassword: NEW } }, res, (e) => assert.fail(e));
        assert.deepEqual([res.statusCode, res.body.code], [409, 'NOT_ELIGIBLE']);
    });
});

/* ================================================================== */
describe('route protection (static check of the route files)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const read = (rel) => fs.readFileSync(path.join(here, '../src/route', rel), 'utf8');
    const lineFor = (text, needle) => text.split('\n').find((line) => line.includes(needle)) ?? '';

    it('account-status and send-password-reset are authenticated and ADMIN-only', () => {
        const routes = read('admin.route/admin.teacher.route/admin.teacher.route/admin.teacher.route.ts');
        for (const needle of ["'/account-status/:id'", "'/send-password-reset/:id'"]) {
            const line = lineFor(routes, needle);
            assert.ok(line, needle);
            assert.match(line, /protectRoute, restrict\('ADMIN'\)/);
        }
    });
    it('the teacher and student password routes stay authenticated and ADMIN-only', () => {
        assert.match(lineFor(read('admin.route/admin.teacher.route/admin.teacher.update.route/admin.teacher.update.route.ts'), "'/password/:id'"), /protectRoute, restrict\('ADMIN'\)/);
        assert.match(lineFor(read('admin.route/admin.student.route/admin.student.update.route/admin.student.update.route.ts'), "'/password/:id'"), /protectRoute, restrict\('ADMIN'\)/);
    });
});
