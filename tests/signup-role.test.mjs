import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';
import { addStudent, addTeacher, addUser, createFakeDb } from './helpers/fakeDb.mjs';

const db = createFakeDb();
globalThis.__TEST_DB__ = db;

const load = createLoader(['service/auth.service/auth.service.ts', 'service/auth.service/signup.role.rules.ts']);
const { signUpUser } = await load('service/auth.service/auth.service.ts');
const { decideSignupRole, AMBIGUOUS_SIGNUP_MESSAGE } = await load('service/auth.service/signup.role.rules.ts');

const addAdmin = (email, isAllowedLogin = true) => {
    db.state.admins.push({ id: 1, isAllowedLogin });
    db.state.adminDetails.push({ adminId: 1, email });
};
const signUp = (email) => signUpUser(email, 'Passw0rd!x', 'Passw0rd!x');

beforeEach(() => db.reset());

describe('decideSignupRole (pure rule)', () => {
    it('one eligible type -> that role', () => {
        assert.deepEqual(decideSignupRole(['TEACHER']), { kind: 'ROLE', role: 'TEACHER' });
        assert.deepEqual(decideSignupRole(['STUDENT', 'STUDENT']), { kind: 'ROLE', role: 'STUDENT' });
    });
    it('none -> NONE; more than one distinct type -> AMBIGUOUS (never "last one wins")', () => {
        assert.deepEqual(decideSignupRole([]), { kind: 'NONE' });
        assert.deepEqual(decideSignupRole(['TEACHER', 'STUDENT']), { kind: 'AMBIGUOUS' });
        assert.deepEqual(decideSignupRole(['ADMIN', 'TEACHER', 'STUDENT']), { kind: 'AMBIGUOUS' });
    });
});

describe('signUpUser role resolution', () => {
    it('a teacher-only email creates a TEACHER login linked to that teacher', async () => {
        const teacherId = addTeacher(db, { email: 'teacher@example.test' });
        const { user } = await signUp('teacher@example.test');
        assert.equal(user.role, 'TEACHER');
        assert.equal(user.teacherId, teacherId);
        assert.equal(user.studentId, null);
    });

    it('a student/family-only email creates a STUDENT login linked to the student', async () => {
        const studentId = addStudent(db, { email: 'family@example.test' });
        const { user } = await signUp('family@example.test');
        assert.equal(user.role, 'STUDENT');
        assert.equal(user.studentId, studentId);
    });

    it('a teacher and a student sharing an email: NO login is created and the role is never silently STUDENT', async () => {
        addTeacher(db, { email: 'shared@example.test' });
        addStudent(db, { email: 'shared@example.test' });
        await assert.rejects(signUp('shared@example.test'), (error) => {
            assert.equal(error.message, AMBIGUOUS_SIGNUP_MESSAGE);
            assert.equal(error.statusCode, 409);
            return true;
        });
        assert.equal(db.state.users.length, 0);
    });

    it('Teacher 86 / Student 5820 shape: shared email, both eligible, no existing login -> refused', async () => {
        addTeacher(db, { id: 86, email: 'rajveer@example.test' });
        addStudent(db, { id: 5820, email: 'rajveer@example.test' });
        await assert.rejects(signUp('rajveer@example.test'), /shared by more than one school record/);
        assert.equal(db.state.users.length, 0);
    });

    it('an unapproved teacher (not allowed to log in) does not make the email ambiguous: the student/family signs up as STUDENT', async () => {
        addTeacher(db, { role: 'APPLICANT', isActive: false, isAllowedLogin: false, email: 'shared@example.test' });
        const studentId = addStudent(db, { email: 'shared@example.test' });
        const { user } = await signUp('shared@example.test');
        assert.equal(user.role, 'STUDENT');
        assert.equal(user.studentId, studentId);
    });

    it('an admin and a teacher sharing an email is also refused', async () => {
        addAdmin('staff@example.test');
        addTeacher(db, { email: 'staff@example.test' });
        await assert.rejects(signUp('staff@example.test'), /shared by more than one school record/);
    });

    it('an email that no eligible profile uses keeps the existing "not allowed" error', async () => {
        addStudent(db, { email: 'locked@example.test', isAllowedLogin: false });
        await assert.rejects(signUp('locked@example.test'), (error) => {
            assert.equal(error.message, 'User is not allowed to sign up. Contact School  ');
            return true;
        });
    });
});

describe('existing valid logins are preserved', () => {
    it('an email that already has a login is still answered with "User already exists" and nothing changes (no conversion STUDENT -> TEACHER)', async () => {
        addTeacher(db, { id: 50, email: 'kirandeep@example.test' });
        addStudent(db, { id: 5445, email: 'kirandeep@example.test' });
        addUser(db, { email: 'kirandeep@example.test', role: 'STUDENT', studentId: 5445 });
        const before = JSON.stringify(db.state.users);
        await assert.rejects(signUp('kirandeep@example.test'), /User already exists\. Please log in\./);
        assert.equal(JSON.stringify(db.state.users), before);
        assert.equal(db.state.users[0].role, 'STUDENT');
        assert.equal(db.state.users[0].teacherId, null);
    });

    it('an existing TEACHER login on a teacher+student email is untouched as well', async () => {
        addTeacher(db, { id: 23, email: 'kirandeep.brar@example.test' });
        addStudent(db, { id: 5558, email: 'kirandeep.brar@example.test' });
        addUser(db, { email: 'kirandeep.brar@example.test', role: 'TEACHER', teacherId: 23 });
        await assert.rejects(signUp('kirandeep.brar@example.test'), /User already exists/);
        assert.equal(db.state.users.length, 1);
    });
});
