import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';
import { addStudent, addTeacher, addUser, createFakeDb } from './helpers/fakeDb.mjs';

const db = createFakeDb();
globalThis.__TEST_DB__ = db;

const load = createLoader(['service/account.status.service/teacher.account.status.service.ts']);
const { getTeacherAccountState, assertTeacherPasswordActionAllowed, decideTeacherAccountStatus, maskEmail, TEACHER_ACCOUNT_STATUS_LABELS } = await load('service/account.status.service/teacher.account.status.service.ts');

beforeEach(() => db.reset());

const statusOf = async (teacherId) => (await getTeacherAccountState(teacherId)).view;
const codes = (view) => view.reasons.map((r) => r.code);
const PENDING = '!SLMS-PENDING-PASSWORD-SETUP!';
const noActions = (view) => assert.deepEqual([view.canChangePassword, view.canSendResetEmail], [false, false]);

describe('labels are exactly the required wording', () => {
    it('five statuses (the old "Email mismatch" status no longer exists)', () => {
        assert.deepEqual(TEACHER_ACCOUNT_STATUS_LABELS, {
            ACTIVE: 'Account active',
            SETUP_PENDING: 'Setup pending',
            NO_ACCOUNT: 'No account yet',
            ACCOUNT_CONFLICT: 'Account conflict — needs review',
            LOGIN_NOT_AVAILABLE: 'Login not available'
        });
    });
});

describe('STATUS from real User/profile relationships', () => {
    it('1. correctly linked TEACHER login, same email, approved + active -> "Account active" and both password actions allowed', async () => {
        addTeacher(db, { id: 30, email: 'teacher30@example.test' });
        addUser(db, { email: 'teacher30@example.test', role: 'TEACHER', teacherId: 30 });
        const view = await statusOf(30);
        assert.equal(view.status, 'ACTIVE');
        assert.equal(view.label, 'Account active');
        assert.deepEqual([view.canChangePassword, view.canSendResetEmail], [true, true]);
        assert.equal(view.login.exists, true);
    });

    it('2. no User account -> "No account yet", no password actions, and NOTHING is created', async () => {
        addTeacher(db, { id: 31, email: 'teacher31@example.test' });
        const before = db.state.users.length;
        const view = await statusOf(31);
        assert.equal(view.status, 'NO_ACCOUNT');
        assert.equal(view.label, 'No account yet');
        noActions(view);
        assert.equal(view.canCreateLogin, true); // an admin MAY create one; the status check itself creates nothing
        assert.deepEqual(codes(view), ['NO_LOGIN']);
        assert.equal(db.state.users.length, before);
    });

    it('3. a STUDENT/parent login owns the teacher\'s profile email (Teacher 50 / Student 5445) -> "No account yet": the student login is never touched, and the teacher login needs a separate email', async () => {
        addTeacher(db, { id: 50, email: 'family50@example.test' });
        addStudent(db, { id: 5445, email: 'family50@example.test' });
        addUser(db, { email: 'family50@example.test', role: 'STUDENT', studentId: 5445 });
        const view = await statusOf(50);
        assert.equal(view.status, 'NO_ACCOUNT');
        noActions(view);
        assert.equal(view.canCreateLogin, true);
        assert.ok(codes(view).includes('PROFILE_EMAIL_USED_BY_STUDENT_LOGIN'));
        assert.equal(view.loginOnProfileEmail.linkedTo, 'STUDENT');
        assert.equal(view.login.exists, false); // the teacher has NO login of their own; the student login is not theirs
    });

    it('3b. an ADMIN login on the teacher\'s profile email (no teacher login yet) -> "Account conflict — needs review": cannot create or act', async () => {
        addTeacher(db, { id: 46, email: 'boss@example.test' });
        addUser(db, { email: 'boss@example.test', role: 'ADMIN', adminId: 3 });
        const view = await statusOf(46);
        assert.equal(view.status, 'ACCOUNT_CONFLICT');
        assert.equal(view.label, 'Account conflict — needs review');
        noActions(view);
        assert.equal(view.canCreateLogin, false);
        assert.ok(codes(view).includes('EMAIL_USED_BY_OTHER_LOGIN'));
    });

    it('4. a deliberately SEPARATE login email (differs from the profile contact email) is NOT an error -> "Account active", actions allowed', async () => {
        addTeacher(db, { id: 32, email: 'family.contact@example.test' });
        addUser(db, { email: 'teacher.login@example.test', role: 'TEACHER', teacherId: 32 });
        const view = await statusOf(32);
        assert.equal(view.status, 'ACTIVE');
        assert.equal(view.label, 'Account active');
        assert.deepEqual([view.canChangePassword, view.canSendResetEmail, view.canCreateLogin], [true, true, false]);
        assert.deepEqual(codes(view), ['LOGIN_EMAIL_DIFFERS']); // information only
    });

    it('4b. SETUP PENDING: the exact pending marker -> "Setup pending"; Change Password off, re-sending the setup email on', async () => {
        addTeacher(db, { id: 37, email: 'family37@example.test' });
        addUser(db, { email: 'login37@example.test', role: 'TEACHER', teacherId: 37, password: PENDING });
        const view = await statusOf(37);
        assert.equal(view.status, 'SETUP_PENDING');
        assert.equal(view.label, 'Setup pending');
        assert.deepEqual([view.canChangePassword, view.canSendResetEmail, view.canCreateLogin], [false, true, false]);
        assert.ok(codes(view).includes('SETUP_PENDING'));
    });

    it('4c. only the EXACT marker is pending: any other non-bcrypt password is not classified as pending', async () => {
        addTeacher(db, { id: 38, email: 't38@example.test' });
        addUser(db, { email: 't38@example.test', role: 'TEACHER', teacherId: 38, password: 'plain-old-text' });
        assert.equal((await statusOf(38)).status, 'ACTIVE');
    });

    it('5. inactive / not approved / login not enabled / deactivated login -> "Login not available", actions disabled', async () => {
        addTeacher(db, { id: 33, email: 't33@example.test', isActive: false });
        addUser(db, { email: 't33@example.test', role: 'TEACHER', teacherId: 33 });
        addTeacher(db, { id: 34, email: 't34@example.test', role: 'APPLICANT', isActive: false, isAllowedLogin: false });
        addTeacher(db, { id: 35, email: 't35@example.test', isAllowedLogin: false });
        addTeacher(db, { id: 36, email: 't36@example.test' });
        addUser(db, { email: 't36@example.test', role: 'TEACHER', teacherId: 36, isActive: false });
        for (const [id, expectedReason] of [[33, 'TEACHER_INACTIVE'], [34, 'TEACHER_NOT_APPROVED'], [35, 'LOGIN_NOT_ALLOWED'], [36, 'LOGIN_DEACTIVATED']]) {
            const view = await statusOf(id);
            assert.equal(view.status, 'LOGIN_NOT_AVAILABLE', `teacher ${id}`);
            assert.equal(view.label, 'Login not available');
            noActions(view);
            assert.ok(codes(view).includes(expectedReason), `teacher ${id}`);
        }
    });
});

describe('status is never decided from the email alone', () => {
    it('a login on the same email that is linked to ANOTHER teacher is a conflict, not "Account active"', async () => {
        addTeacher(db, { id: 40, email: 'dup@example.test' });
        addTeacher(db, { id: 41, email: 'someone.else@example.test' });
        addUser(db, { email: 'dup@example.test', role: 'TEACHER', teacherId: 41 });
        const view = await statusOf(40);
        assert.equal(view.status, 'ACCOUNT_CONFLICT');
        assert.equal(view.loginOnProfileEmail.linkedTo, 'OTHER_TEACHER');
        noActions(view);
    });

    it('a login LINKED to the teacher but with a non-TEACHER role is a conflict', async () => {
        addTeacher(db, { id: 42, email: 'wrongrole@example.test' });
        addUser(db, { email: 'wrongrole@example.test', role: 'STUDENT', teacherId: 42 });
        const view = await statusOf(42);
        assert.equal(view.status, 'ACCOUNT_CONFLICT');
        assert.ok(codes(view).includes('LOGIN_WRONG_ROLE'));
        noActions(view);
    });

    it('a teacher WITH their own linked login is not blocked because another account uses the profile contact email', async () => {
        addTeacher(db, { id: 43, email: 'profile43@example.test' });
        addUser(db, { email: 'login43@example.test', role: 'TEACHER', teacherId: 43 });
        addUser(db, { email: 'profile43@example.test', role: 'STUDENT', studentId: 9 });
        const view = await statusOf(43);
        assert.equal(view.status, 'ACTIVE');
        assert.ok(codes(view).includes('PROFILE_EMAIL_USED_BY_STUDENT_LOGIN'));
    });

    it('email comparison ignores case and surrounding spaces', async () => {
        addTeacher(db, { id: 44, email: 'Mixed.Case@Example.test' });
        addUser(db, { email: 'mixed.case@example.test', role: 'TEACHER', teacherId: 44 });
        assert.equal((await statusOf(44)).status, 'ACTIVE');
    });

    it('eligibility beats everything: an inactive teacher with a conflict is "Login not available", but the conflict is still listed', async () => {
        addTeacher(db, { id: 45, email: 'both@example.test', isActive: false });
        addUser(db, { email: 'both@example.test', role: 'STUDENT', studentId: 5 });
        const view = await statusOf(45);
        assert.equal(view.status, 'LOGIN_NOT_AVAILABLE');
        assert.ok(codes(view).includes('PROFILE_EMAIL_USED_BY_STUDENT_LOGIN'));
    });

    it('unknown teacher -> null (controller answers 404)', async () => {
        assert.equal(await getTeacherAccountState(99999), null);
    });
});

describe('SHARED-EMAIL cases from the school', () => {
    it('Teacher 86 / Student 5820: shared contact email, neither has a login -> "No account yet" with an explanatory note; student not touched', async () => {
        addTeacher(db, { id: 86, email: 'rajveer@example.test' });
        addStudent(db, { id: 5820, email: 'rajveer@example.test' });
        const view = await statusOf(86);
        assert.equal(view.status, 'NO_ACCOUNT');
        noActions(view);
        assert.deepEqual(view.sharedStudentIds, [5820]);
        assert.ok(codes(view).includes('SHARED_STUDENT_EMAIL'));
        assert.equal(db.state.users.length, 0);
    });

    it('Teacher 79 / Student 5654: same shape -> "No account yet" + shared-email note', async () => {
        addTeacher(db, { id: 79, email: 'family79@example.test' });
        addStudent(db, { id: 5654, email: 'family79@example.test' });
        const view = await statusOf(79);
        assert.equal(view.status, 'NO_ACCOUNT');
        assert.deepEqual(view.sharedStudentIds, [5654]);
    });

    it('Teacher 23 / Student 5558: the TEACHER login is linked to Teacher 23 -> "Account active" despite the shared contact email', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep@example.test' });
        addStudent(db, { id: 5558, email: 'kirandeep@example.test' });
        addUser(db, { email: 'kirandeep@example.test', role: 'TEACHER', teacherId: 23 });
        const view = await statusOf(23);
        assert.equal(view.status, 'ACTIVE');
        assert.ok(codes(view).includes('SHARED_STUDENT_EMAIL'));
        assert.deepEqual([view.canChangePassword, view.canSendResetEmail], [true, true]);
    });

    it('Teacher 50 / Student 5445: the login on the email is the STUDENT\'s -> "No account yet" (a separate teacher login can be created); the teacher gets no access to the student login', async () => {
        addTeacher(db, { id: 50, email: 'mum@example.test' });
        addStudent(db, { id: 5445, email: 'mum@example.test' });
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 5445 });
        const view = await statusOf(50);
        assert.equal(view.status, 'NO_ACCOUNT');
        noActions(view);
        assert.equal(view.canCreateLogin, true);
        assert.throws(() => assertTeacherPasswordActionAllowed(view), (e) => e.statusCode === 404 && e.code === 'NO_ACCOUNT');
    });
});

describe('the status view never leaks passwords or full emails', () => {
    it('contains only masked emails and no password/token fields', async () => {
        addTeacher(db, { id: 60, email: 'teacher60@example.test' });
        addUser(db, { email: 'login60@example.test', role: 'TEACHER', teacherId: 60, password: 'SECRET-HASH', resetPasswordToken: 'TOKEN' });
        const json = JSON.stringify((await getTeacherAccountState(60)).view);
        assert.doesNotMatch(json, /teacher60@example|login60@example|SECRET-HASH|TOKEN|"password"|resetPasswordToken/i);
        assert.match(json, /te\*\*\*@ex\*\*\*\.test/);
    });
    it('the internal ids/emails are returned separately and are not part of the view', async () => {
        addTeacher(db, { id: 61, email: 'teacher61@example.test' });
        addUser(db, { id: 777, email: 'teacher61@example.test', role: 'TEACHER', teacherId: 61 });
        const state = await getTeacherAccountState(61);
        assert.equal(state.internal.linkedLoginId, 777);
        assert.equal('linkedLoginId' in state.view, false);
    });
    it('the pending-setup marker is reduced to a status and never appears in the view', async () => {
        addTeacher(db, { id: 62, email: 'teacher62@example.test' });
        addUser(db, { email: 'login62@example.test', role: 'TEACHER', teacherId: 62, password: PENDING });
        const state = await getTeacherAccountState(62);
        assert.equal(state.view.status, 'SETUP_PENDING');
        assert.doesNotMatch(JSON.stringify(state), /PENDING-PASSWORD-SETUP|"password"/i);
    });
    it('maskEmail', () => {
        assert.equal(maskEmail('rajveer@icloud.com'), 'ra***@ic***.com');
        assert.equal(maskEmail(''), '');
        assert.equal(maskEmail('nope'), '');
    });
});

describe('the password gate (assertTeacherPasswordActionAllowed)', () => {
    const facts = (o = {}) => ({ teacher: { id: 1, role: 'TEACHER', isActive: true, isAllowedLogin: true }, profileEmail: 'a@x.test', linkedLogin: null, emailLogin: null, sharedStudentIds: [], ...o });
    const view = (o) => ({ ...decideTeacherAccountStatus(facts(o)) });
    it('maps each non-active status to a clear error and allows ACTIVE', () => {
        assert.throws(() => assertTeacherPasswordActionAllowed(view({})), (e) => e.statusCode === 404 && e.code === 'NO_ACCOUNT' && /No account was created/.test(e.message));
        assert.throws(() => assertTeacherPasswordActionAllowed(view({ emailLogin: { id: 5, role: 'TEACHER', teacherId: 7, studentId: null, adminId: null } })), (e) => e.statusCode === 409 && e.code === 'ACCOUNT_CONFLICT');
        assert.throws(() => assertTeacherPasswordActionAllowed(view({ teacher: { id: 1, role: 'TEACHER', isActive: false, isAllowedLogin: true } })), (e) => e.statusCode === 409 && e.code === 'LOGIN_NOT_AVAILABLE');
        assert.doesNotThrow(() => assertTeacherPasswordActionAllowed(view({ linkedLogin: { id: 5, email: 'a@x.test', role: 'TEACHER', isActive: true } })));
    });
    it('a separate login email is allowed for both actions', () => {
        const separate = view({ linkedLogin: { id: 5, email: 'other.login@x.test', role: 'TEACHER', isActive: true } });
        assert.doesNotThrow(() => assertTeacherPasswordActionAllowed(separate, 'CHANGE_PASSWORD'));
        assert.doesNotThrow(() => assertTeacherPasswordActionAllowed(separate, 'SEND_RESET_EMAIL'));
    });
    it('SETUP_PENDING: Change Password is refused (409 SETUP_PENDING), re-sending the setup email is allowed', () => {
        const pending = view({ linkedLogin: { id: 5, email: 'a@x.test', role: 'TEACHER', isActive: true, setupPending: true } });
        assert.throws(() => assertTeacherPasswordActionAllowed(pending, 'CHANGE_PASSWORD'), (e) => e.statusCode === 409 && e.code === 'SETUP_PENDING');
        assert.throws(() => assertTeacherPasswordActionAllowed(pending), (e) => e.code === 'SETUP_PENDING'); // default action is the stricter one
        assert.doesNotThrow(() => assertTeacherPasswordActionAllowed(pending, 'SEND_RESET_EMAIL'));
    });
});
