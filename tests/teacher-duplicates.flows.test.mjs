import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';
import { addStudent, addTeacher, addUser, createFakeDb } from './helpers/fakeDb.mjs';

const db = createFakeDb();
globalThis.__TEST_DB__ = db;

const load = createLoader([
    'service/new.applicant.service/teacher.applicant.service.ts',
    'service/new.applicant.service/new.applicant.service.ts',
    'service/admin.service/admin.teacher.approve.service/admin.teacher.approve.service.ts',
    'service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts',
    'controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller.ts',
    'controller/admin.controller/admin.teacher.approve.controller/admin.teacher.approve.controller.ts',
    'controller/new.applicant.controller/new.applicant.controller.ts'
]);
const { createTeacherApplicant } = await load('service/new.applicant.service/teacher.applicant.service.ts');
const { checkEmailForApplication } = await load('service/new.applicant.service/new.applicant.service.ts');
const { approveTeacherApplication, reviewTeacherApplication } = await load('service/admin.service/admin.teacher.approve.service/admin.teacher.approve.service.ts');
const { updateTeacherPersonalDetail } = await load('service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service.ts');
const { updateTeacherPersonalDetailHandler } = await load('controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller.ts');
const { checkEmailHandler } = await load('controller/new.applicant.controller/new.applicant.controller.ts');
const { approveTeacherApplicationHandler, reviewTeacherApplicationHandler } = await load('controller/admin.controller/admin.teacher.approve.controller/admin.teacher.approve.controller.ts');

const EMAIL_MESSAGE = 'This email is already registered. Please use a different email.';
const IDENTITY_MESSAGE = 'A teacher with these details already exists. Please contact the school office.';
const WWC_MESSAGE = 'This Working With Children Check number is already registered. Please check the number you entered, or contact the school office.';

beforeEach(() => {
    db.reset();
    globalThis.__TEST_LOG__ = [];
});

/* ---------- builders ---------- */
let wwcCounter = 0; // every application gets its own WWC card number unless a test sets one (the database requires them to be unique)
const application = ({ personal = {}, bank = {}, wwc } = {}) => ({
    teacherEmergencyContact: { contactNumber: '0400000000', contactPerson: 'Contact Person', relationship: 'Husband' },
    teacherWWCHealthInformation: { medicalCondition: 'None', medicareNumber: '', childrenCheckCardNumber: wwc ?? `WWC-${++wwcCounter}`, workingWithChildrenCheckExpiry: '2030-01-01T00:00:00.000Z', workingwithChildrenCheckCardPhotoImage: 'img' },
    teacherOtherInformation: { otherInfo: '' },
    teacherPersonalDetails: {
        email: 'new.teacher@example.test',
        address: '9 New Street',
        contact: '0411111111',
        country: 'Australia',
        firstName: 'Newfirst',
        gender: 'female',
        lastName: 'Newlast',
        postcode: '3978',
        state: 'Victoria',
        suburb: 'Clyde North',
        DOB: '1991-02-03T10:00:00.000Z',
        image: 'img',
        ...personal
    },
    teacherQualificationAvailability: { subjectsChosen: ['Gurmat'], experience: 'none', qualification: 'none', timeSlotsChosen: [] },
    teacherBankDetails: { BSB: '', accountNumber: '', bankAccountName: '', ABN: '', ...bank },
    teacherWorkRights: { immigrationStatus: 'AustralianCitizen', workRights: 'yes' }
});
const detailOf = (id) => db.state.details.find((d) => d.teacherId === id);
const teacherOf = (id) => db.state.teachers.find((t) => t.id === id);
const editPayload = (id, overrides = {}) => {
    const d = detailOf(id);
    return {
        id: String(id),
        firstName: d.firstName,
        lastName: d.lastName,
        DOB: d.DOB.toISOString(),
        gender: d.gender,
        email: d.email,
        contact: d.contact,
        address: d.address,
        suburb: d.suburb,
        state: d.state,
        country: d.country,
        postcode: d.postcode,
        image: 'img',
        ...overrides
    };
};
const rejectsWith = (promise, message, statusCode = 409) =>
    assert.rejects(promise, (error) => {
        assert.equal(error.message, message);
        assert.equal(error.statusCode, statusCode);
        return true;
    });
const codes = (result) => result.warnings.map((warning) => warning.code);

/* ================================================================== */
describe('REGISTRATION', () => {
    it('accepts a new teacher and stores the email trimmed and lowercased', async () => {
        const created = await createTeacherApplicant(application({ personal: { email: ' New.Teacher@Example.TEST ' } }));
        assert.equal(created.role, 'APPLICANT');
        assert.equal(detailOf(created.id).email, 'new.teacher@example.test');
    });

    it('rejects an email already used by another teacher (case-insensitive) with the exact public message', async () => {
        addTeacher(db, { email: 'new.teacher@example.test' });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'NEW.Teacher@Example.test' } })), EMAIL_MESSAGE);
    });

    it('includes INACTIVE and PENDING teacher records in the email check', async () => {
        addTeacher(db, { email: 'inactive@example.test', role: 'TEACHER', isActive: false });
        addTeacher(db, { email: 'pending@example.test', role: 'APPLICANT', isActive: false, isAllowedLogin: false });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'inactive@example.test' } })), EMAIL_MESSAGE);
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'pending@example.test' } })), EMAIL_MESSAGE);
    });

    it('rejects the same normalised name + DOB even with a different email and phone, with the exact public message', async () => {
        addTeacher(db, { firstName: 'Newfirst', lastName: 'Newlast', dob: '1991-02-03T10:00:00.000Z', email: 'other@example.test', contact: '0499999999' });
        await rejectsWith(createTeacherApplicant(application()), IDENTITY_MESSAGE);
    });

    it('the public message never exposes the other teacher (no id, status, email or phone)', async () => {
        addTeacher(db, { id: 83, firstName: 'Newfirst', lastName: 'Newlast', dob: '1991-02-03T10:00:00.000Z', email: 'secret83@example.test', contact: '0455555555' });
        await assert.rejects(createTeacherApplicant(application()), (error) => {
            assert.doesNotMatch(error.message, /83|secret|0455|active|inactive/i);
            return true;
        });
    });

    it('Teachers 83/86 shape: stored first name has a trailing space and a different DOB timestamp on the same Melbourne date', async () => {
        addTeacher(db, { id: 83, firstName: 'Rajveer ', lastName: 'Kaur', dob: '2001-10-15T19:30:00.000Z', email: 'kaurvir@example.test', contact: '0435920412' });
        const attempt = application({ personal: { firstName: 'rajveer', lastName: ' KAUR', DOB: '2001-10-15T18:30:00.000Z', email: 'rajveer.new@example.test', contact: '0435920412' } });
        await rejectsWith(createTeacherApplicant(attempt), IDENTITY_MESSAGE);
    });

    it('an INACTIVE or PENDING teacher with the same name + DOB also blocks', async () => {
        addTeacher(db, { firstName: 'Newfirst', lastName: 'Newlast', dob: '1991-02-03T10:00:00.000Z', isActive: false, email: 'a@example.test' });
        await rejectsWith(createTeacherApplicant(application()), IDENTITY_MESSAGE);
        db.reset();
        addTeacher(db, { firstName: 'Newfirst', lastName: 'Newlast', dob: '1991-02-03T10:00:00.000Z', role: 'APPLICANT', isActive: false, email: 'b@example.test' });
        await rejectsWith(createTeacherApplicant(application()), IDENTITY_MESSAGE);
    });

    it('DOB alone does not block (same DOB, different name)', async () => {
        addTeacher(db, { firstName: 'Someone', lastName: 'Else', dob: '1991-02-03T10:00:00.000Z' });
        assert.ok((await createTeacherApplicant(application())).id);
    });

    it('name alone does not block (Teachers 12/28 shape: same name, different DOB)', async () => {
        addTeacher(db, { firstName: 'Newfirst', lastName: 'Newlast', dob: '1986-03-17T19:30:00.000Z' });
        assert.ok((await createTeacherApplicant(application())).id);
    });

    it('a shared phone number alone does not block (Teachers 73/77 shape) and is only logged, without personal values', async () => {
        addTeacher(db, { id: 73, contact: '0411111111', email: 'seventythree@example.test' });
        const created = await createTeacherApplicant(application());
        assert.ok(created.id);
        const logged = JSON.stringify(globalThis.__TEST_LOG__);
        assert.match(logged, /SHARED_PHONE/);
        assert.doesNotMatch(logged, /example\.test|0411111111/);
    });

    it('blocks an email shared with a student record (Scope of Work A5), and creates nothing', async () => {
        addStudent(db, { id: 5820, email: 'new.teacher@example.test' });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'NEW.Teacher@example.test' } })), EMAIL_MESSAGE);
        assert.equal(db.state.details.length, 0);
        assert.equal(db.state.users.length, 0);
    });

    it('blocks an email that any login uses: STUDENT, TEACHER or ADMIN', async () => {
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 5001 });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'family@example.test' } })), EMAIL_MESSAGE);
        addUser(db, { email: 'staff@example.test', role: 'TEACHER', teacherId: 4321 });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'staff@example.test', firstName: 'Another', lastName: 'Person' } })), EMAIL_MESSAGE);
        addUser(db, { email: 'admin@example.test', role: 'ADMIN', adminId: 1 });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'admin@example.test', firstName: 'Third', lastName: 'Person' } })), EMAIL_MESSAGE);
    });

    it('rejects an invalid DOB with a clear message', async () => {
        await rejectsWith(createTeacherApplicant(application({ personal: { DOB: 'not-a-date' } })), 'Please provide a valid date of birth.', 400);
    });

    it('two simultaneous registrations for the same identity: exactly one is created (advisory lock)', async () => {
        const a = application({ personal: { email: 'one@example.test' } });
        const b = application({ personal: { email: 'two@example.test' } });
        const results = await Promise.allSettled([createTeacherApplicant(a), createTeacherApplicant(b)]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        const rejected = results.find((r) => r.status === 'rejected');
        assert.equal(rejected.reason.message, IDENTITY_MESSAGE);
        assert.equal(db.state.details.length, 1);
        assert.equal(db.lockLog.length >= 2, true);
    });

    it('CONTROL: without the lock the same race creates two records (proves the test can detect the race)', async () => {
        db.setLocks(false);
        const results = await Promise.allSettled([createTeacherApplicant(application({ personal: { email: 'one@example.test' } })), createTeacherApplicant(application({ personal: { email: 'two@example.test' } }))]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
    });

    it('a unique-email violation from another writer is reported as a duplicate email (the check saw nothing, the database refuses)', async () => {
        addTeacher(db, { email: 'new.teacher@example.test' });
        db.hooks.teacherDetailsFindMany = async () => []; // simulate a row committed by another writer after the check
        await rejectsWith(createTeacherApplicant(application()), EMAIL_MESSAGE);
        assert.equal(db.state.details.length, 1); // nothing extra was saved
    });

    it('a reused WWC card number is reported as a WWC problem, NOT as an email problem (409 with the WWC message)', async () => {
        addTeacher(db, { email: 'someone.else@example.test', wwc: 'WWC-SHARED' });
        await rejectsWith(createTeacherApplicant(application({ wwc: 'WWC-SHARED' })), WWC_MESSAGE, 409);
        assert.equal(db.state.details.length, 1); // nothing extra was saved
        assert.equal(db.state.wwc.length, 1);
    });

    it('each duplicate gets its own message: email -> email message, WWC -> WWC message, name+DOB -> the teacher-duplicate message', async () => {
        addTeacher(db, { id: 1, firstName: 'Other', lastName: 'Person', dob: '1980-01-01T00:00:00.000Z', email: 'taken@example.test', wwc: 'WWC-TAKEN' });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'TAKEN@example.test' } })), EMAIL_MESSAGE, 409);
        await rejectsWith(createTeacherApplicant(application({ wwc: 'WWC-TAKEN' })), WWC_MESSAGE, 409);
        addTeacher(db, { id: 2, firstName: 'Newfirst', lastName: 'Newlast', dob: '1991-02-03T10:00:00.000Z', email: 'twin@example.test' });
        await rejectsWith(createTeacherApplicant(application({ personal: { email: 'brand.new@example.test' } })), IDENTITY_MESSAGE, 409);
        // a normal application with a fresh WWC number still works
        assert.equal((await createTeacherApplicant(application({ personal: { email: 'fresh@example.test', firstName: 'Fresh', lastName: 'Person' } }))).role, 'APPLICANT');
    });

    it('a database unique violation on an unknown field is NOT reported as an email problem (generic teacher-duplicate message)', async () => {
        db.hooks.teacherCreate = async () => {
            throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['somethingElse'] } });
        };
        await rejectsWith(createTeacherApplicant(application()), IDENTITY_MESSAGE, 409);
    });

    it('a WWC violation reported as an index-name string (other driver shape) is still recognised', async () => {
        db.hooks.teacherCreate = async () => {
            throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: 'TeacherWWCHealthInformation_childrenCheckCardNumber_key' } });
        };
        await rejectsWith(createTeacherApplicant(application()), WWC_MESSAGE, 409);
    });

    it('an unexpected failure keeps the original generic message and saves nothing', async () => {
        db.hooks.teacherCreate = async () => {
            throw new Error('boom');
        };
        await rejectsWith(createTeacherApplicant(application()), 'Failed to create application with ', 404);
        assert.equal(db.state.details.length, 0);
    });
});

/* ================================================================== */
describe('PUBLIC EMAIL PRE-CHECK', () => {
    it('teacher form: another teacher record (any status) is taken; unknown email is free', async () => {
        addTeacher(db, { email: 'taken@example.test', isActive: false });
        assert.deepEqual(await checkEmailForApplication('TAKEN@example.test ', 'teacher'), { emailTaken: true });
        assert.deepEqual(await checkEmailForApplication('free@example.test', 'teacher'), { emailTaken: false });
    });
    it('teacher form: any login (TEACHER, ADMIN or STUDENT) or a student record blocks the email (Scope of Work A5)', async () => {
        addUser(db, { email: 'staff@example.test', role: 'TEACHER', teacherId: 1 });
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 2 });
        addStudent(db, { email: 'profileonly@example.test' });
        assert.deepEqual(await checkEmailForApplication('staff@example.test', 'teacher'), { emailTaken: true });
        assert.deepEqual(await checkEmailForApplication('family@example.test', 'teacher'), { emailTaken: true });
        assert.deepEqual(await checkEmailForApplication('ProfileOnly@example.test', 'teacher'), { emailTaken: true });
        assert.deepEqual(await checkEmailForApplication('free@example.test', 'teacher'), { emailTaken: false });
    });
    it('student form behaviour is unchanged: blocked by a TEACHER login, allowed with a STUDENT login (siblings)', async () => {
        addUser(db, { email: 'staff@example.test', role: 'TEACHER', teacherId: 1 });
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 2 });
        assert.deepEqual(await checkEmailForApplication('staff@example.test', 'student'), { emailTaken: true });
        assert.deepEqual(await checkEmailForApplication('family@example.test', 'student'), { emailTaken: false });
    });

    describe('REGRESSION: the public response never reveals what the email belongs to', () => {
        const LEAKS = /role|reason|TEACHER|ADMIN|STUDENT|registered_user|existing_application|student_record/;

        it('every "taken" cause produces the exact same response: only { emailTaken: true }', async () => {
            addTeacher(db, { email: 'teacher.record@example.test' }); // a teacher record
            addTeacher(db, { email: 'inactive.teacher@example.test', isActive: false }); // an inactive teacher record
            addTeacher(db, { email: 'pending@example.test', role: 'APPLICANT', isActive: false, isAllowedLogin: false }); // a pending application
            addUser(db, { email: 'teacher.login@example.test', role: 'TEACHER', teacherId: 1 }); // a teacher login
            addUser(db, { email: 'admin.login@example.test', role: 'ADMIN', adminId: 1 }); // an admin login
            const causes = ['teacher.record', 'inactive.teacher', 'pending', 'teacher.login', 'admin.login'].map((name) => `${name}@example.test`);
            const responses = [];
            for (const email of causes) responses.push(await checkEmailForApplication(email, 'teacher'));
            for (const response of responses) {
                assert.deepEqual(response, { emailTaken: true });
                assert.deepEqual(Object.keys(response), ['emailTaken']);
                assert.doesNotMatch(JSON.stringify(response), LEAKS);
            }
            // and the student form, for the staff-login causes that block it
            for (const email of ['teacher.login@example.test', 'admin.login@example.test']) {
                const response = await checkEmailForApplication(email, 'student');
                assert.deepEqual(response, { emailTaken: true });
                assert.deepEqual(Object.keys(response), ['emailTaken']);
            }
        });

        it('a free email and a taken email differ ONLY by the boolean', async () => {
            addUser(db, { email: 'admin.login@example.test', role: 'ADMIN', adminId: 1 });
            const taken = await checkEmailForApplication('admin.login@example.test', 'teacher');
            const free = await checkEmailForApplication('nobody@example.test', 'teacher');
            assert.deepEqual(Object.keys(taken), Object.keys(free));
            assert.equal(taken.emailTaken, true);
            assert.equal(free.emailTaken, false);
        });

        it('the HTTP handler returns exactly the minimal body with status 200', async () => {
            addUser(db, { email: 'admin.login@example.test', role: 'ADMIN', adminId: 1 });
            const res = fakeResponse();
            await checkEmailHandler({ query: { email: 'admin.login@example.test', applicationType: 'teacher' } }, res, (error) => assert.fail(error));
            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.body, { emailTaken: true });
        });
    });
});

/* ================================================================== */
describe('APPROVAL', () => {
    const applicant = (o = {}) => addTeacher(db, { role: 'APPLICANT', isActive: false, isAllowedLogin: false, firstName: 'Applicant', lastName: 'Person', dob: '1992-07-07T00:00:00.000Z', ...o });

    it('still requires an assigned subject (existing rule)', async () => {
        const id = applicant({ subjects: false });
        await rejectsWith(approveTeacherApplication(String(id)), 'Teacher does not have any subjects assigned and cannot be approved.', 400);
    });

    it('approves a clean application (own record is never a conflict) and returns no warnings', async () => {
        const id = applicant();
        const result = await approveTeacherApplication(String(id));
        assert.equal(result.role, 'TEACHER');
        assert.equal(result.isActive, true);
        assert.equal(result.isAllowedLogin, true);
        assert.deepEqual(result.warnings, []);
        assert.equal(teacherOf(id).role, 'TEACHER');
    });

    it('BLOCKS when another teacher (even inactive) has the same name + DOB, naming the teacher ID, and changes nothing', async () => {
        addTeacher(db, { id: 83, firstName: 'Applicant', lastName: 'Person', dob: '1992-07-06T19:30:00.000Z', isActive: false, email: 'old@example.test' });
        const id = applicant({ email: 'different@example.test', contact: '0488888888' });
        await assert.rejects(approveTeacherApplication(String(id)), (error) => {
            assert.equal(error.statusCode, 409);
            assert.match(error.message, /Teacher #83 \(inactive teacher\)/);
            assert.match(error.message, /Approval is blocked\./);
            assert.deepEqual(error.toResponse().conflicts, [{ kind: 'NAME_DOB', teacherId: 83, status: 'inactive teacher' }]);
            return true;
        });
        assert.equal(teacherOf(id).role, 'APPLICANT');
        assert.equal(teacherOf(id).isActive, false);
    });

    it('BLOCKS on an email already used by another teacher, including a stored mixed-case value', async () => {
        addTeacher(db, { id: 12, email: 'Mixed.Case@Example.test' });
        const id = applicant({ email: 'mixed.case@example.test' });
        await assert.rejects(approveTeacherApplication(String(id)), (error) => {
            assert.match(error.message, /Teacher #12 \(active teacher\)/);
            return true;
        });
    });

    it('BLOCKS when a TEACHER login that belongs to someone else uses the email', async () => {
        addUser(db, { email: 'login@example.test', role: 'TEACHER', teacherId: 4321 });
        const id = applicant({ email: 'login@example.test' });
        await assert.rejects(approveTeacherApplication(String(id)), (error) => {
            assert.equal(error.toResponse().conflicts[0].kind, 'LOGIN_EMAIL');
            return true;
        });
    });

    it('shared phone is a warning only: approval goes ahead', async () => {
        addTeacher(db, { id: 73, contact: '0433 333 333', email: 'x@example.test' });
        const id = applicant({ contact: '0433333333' });
        const result = await approveTeacherApplication(String(id));
        assert.equal(result.role, 'TEACHER');
        assert.deepEqual(codes(result), ['SHARED_PHONE']);
        assert.deepEqual(result.warnings[0].teacherIds, [73]);
    });

    it('email shared with a student/family profile: approved WITH a warning (legitimate family email), no login is created', async () => {
        addStudent(db, { id: 5820, akaalId: 5759, email: 'family@example.test' });
        const id = applicant({ email: 'family@example.test' });
        const result = await approveTeacherApplication(String(id));
        assert.equal(result.role, 'TEACHER');
        assert.deepEqual(codes(result), ['SHARED_STUDENT_EMAIL']);
        assert.match(result.warnings[0].message, /Student #5820 \(Akaal ID 5759\)/);
        assert.match(result.warnings[0].message, /will not be created automatically/);
        assert.equal(db.state.users.length, 0);
    });

    it('a STUDENT login on the email adds a second warning but does not block', async () => {
        addStudent(db, { id: 5445, email: 'mum@example.test' });
        addUser(db, { email: 'mum@example.test', role: 'STUDENT', studentId: 5445 });
        const id = applicant({ email: 'mum@example.test' });
        const result = await approveTeacherApplication(String(id));
        assert.deepEqual(codes(result).sort(), ['SHARED_STUDENT_EMAIL', 'STUDENT_LOGIN_ON_EMAIL']);
    });

    it('Teachers 41/47 shape: possible duplicate warning, not a block, and no bank/address values leak', async () => {
        addTeacher(db, { id: 47, firstName: 'Manjit', lastName: 'Singh', dob: '1978-08-05T14:00:00Z', address: '28 Riverside Drive', postcode: '3977', bank: ['083323', '232686881'], email: 'm47@example.test', contact: '0402926479' });
        const id = applicant({ firstName: 'Xxxx Manjit', lastName: 'Singh xxxx', dob: '1979-08-04T14:00:00Z', address: '28 Riverside drive', postcode: '3977', bank: ['083323', '232686881'], email: 'm41@example.test', contact: '0402926470' });
        const result = await approveTeacherApplication(String(id));
        assert.equal(result.role, 'TEACHER');
        const possible = result.warnings.find((w) => w.code === 'POSSIBLE_DUPLICATE');
        assert.deepEqual(possible.teacherIds, [47]);
        assert.doesNotMatch(JSON.stringify(result.warnings), /232686881|083323|Riverside/);
    });

    it('shared address or shared bank alone, with a different name, raises no possible-duplicate warning', async () => {
        addTeacher(db, { id: 49, firstName: 'Baljit', lastName: 'Kaur', address: '90 Lake View Drive', postcode: '3805', bank: ['063168', '10661805'], email: 'w@example.test' });
        const id = applicant({ address: '90 Lake View Drive', postcode: '3805', bank: ['063168', '10661805'] });
        assert.deepEqual((await approveTeacherApplication(String(id))).warnings, []);
    });

    it('refuses to approve a record with no personal details (never skips the check silently)', async () => {
        const id = applicant();
        db.state.details = db.state.details.filter((d) => d.teacherId !== id);
        await rejectsWith(approveTeacherApplication(String(id)), 'This application has no personal details and cannot be approved.', 400);
    });

    it('the review preview returns the same blocking reasons and warnings and changes nothing', async () => {
        addTeacher(db, { id: 83, firstName: 'Applicant', lastName: 'Person', dob: '1992-07-07T00:00:00.000Z', email: 'old@example.test', contact: '0455000000' });
        const id = applicant({ contact: '0455000000' });
        const review = await reviewTeacherApplication(String(id));
        assert.equal(review.blocking.length, 1);
        assert.match(review.blockingMessages[0], /Teacher #83/);
        assert.deepEqual(review.warnings.map((w) => w.code), ['SHARED_PHONE']);
        assert.equal(teacherOf(id).role, 'APPLICANT');
    });

    it('enforced by the BACKEND controller: a blocked approval answers 409 with the reason and conflicting id', async () => {
        addTeacher(db, { id: 83, firstName: 'Applicant', lastName: 'Person', dob: '1992-07-07T00:00:00.000Z', email: 'old@example.test' });
        const id = applicant();
        const res = fakeResponse();
        await approveTeacherApplicationHandler({ params: { id: String(id) }, body: {} }, res, (error) => assert.fail(error));
        assert.equal(res.statusCode, 409);
        assert.match(res.body.message, /Teacher #83/);
        assert.equal(teacherOf(id).role, 'APPLICANT');
    });

    it('review endpoint handler returns blocking reasons and warnings', async () => {
        const id = applicant();
        const res = fakeResponse();
        await reviewTeacherApplicationHandler({ params: { id: String(id) } }, res, (error) => assert.fail(error));
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.blocking, []);
    });
});

/* ================================================================== */
describe('PROFILE EDITING', () => {
    it('Teachers 83/86: an existing duplicate pair does not block an unrelated edit, and unchanged email/phone/DOB/name are accepted', async () => {
        addTeacher(db, { id: 83, firstName: 'Rajveer ', lastName: 'Kaur', dob: '2001-10-15T19:30:00.000Z', email: 'kaurvir@example.test', contact: '0435920412', address: '4 Winter Street' });
        addTeacher(db, { id: 86, firstName: 'Rajveer', lastName: 'Kaur', dob: '2001-10-15T19:30:00.000Z', email: 'rajveerkaur@example.test', contact: '0435920412', address: '4 Winter Street' });
        for (const id of [83, 86]) {
            const result = await updateTeacherPersonalDetail(String(id), editPayload(id, { suburb: 'Clyde North Updated' }));
            assert.deepEqual(result.warnings, []);
            assert.equal(detailOf(id).suburb, 'Clyde North Updated');
        }
    });

    it('re-sending the same DOB as a different timestamp on the same calendar date is not a change', async () => {
        addTeacher(db, { id: 86, firstName: 'Rajveer', lastName: 'Kaur', dob: '2001-10-15T19:30:00.000Z' });
        addTeacher(db, { id: 83, firstName: 'Rajveer', lastName: 'Kaur', dob: '2001-10-15T19:30:00.000Z', email: 'o@example.test' });
        const result = await updateTeacherPersonalDetail('86', editPayload(86, { DOB: '2001-10-15T18:30:00.000Z' }));
        assert.deepEqual(result.warnings, []);
    });

    it('saves valid changes and stores the email trimmed/lowercased; a mixed-case unchanged email just normalises', async () => {
        addTeacher(db, { id: 30, email: 'Old.Mixed@Example.test' });
        const result = await updateTeacherPersonalDetail('30', editPayload(30, { email: ' OLD.mixed@example.TEST ', address: '5 Brand New Road' }));
        assert.equal(detailOf(30).email, 'old.mixed@example.test');
        assert.equal(detailOf(30).address, '5 Brand New Road');
        assert.deepEqual(result.warnings, []);
    });

    it('REJECTS a newly introduced duplicate email (case-insensitive), names the teacher ID, and saves nothing', async () => {
        addTeacher(db, { id: 5, email: 'Taken@Example.test' });
        addTeacher(db, { id: 30, email: 'mine@example.test' });
        await assert.rejects(updateTeacherPersonalDetail('30', editPayload(30, { email: 'taken@example.test' })), (error) => {
            assert.equal(error.statusCode, 409);
            assert.match(error.message, /This email is already used by Teacher #5 \(active teacher\)\./);
            assert.match(error.message, /The change was not saved\./);
            return true;
        });
        assert.equal(detailOf(30).email, 'mine@example.test');
    });

    it('REJECTS a newly introduced name + DOB duplicate (changing the name), and the DOB-change variant too', async () => {
        addTeacher(db, { id: 5, firstName: 'Taken', lastName: 'Identity', dob: '1980-01-01T00:00:00.000Z' });
        addTeacher(db, { id: 30, firstName: 'Mine', lastName: 'Identity', dob: '1980-01-01T00:00:00.000Z', email: 'mine@example.test' });
        await assert.rejects(updateTeacherPersonalDetail('30', editPayload(30, { firstName: 'Taken' })), (error) => {
            assert.match(error.message, /same name and date of birth already exists: Teacher #5/);
            return true;
        });
        addTeacher(db, { id: 31, firstName: 'Taken', lastName: 'Identity', dob: '1999-09-09T00:00:00.000Z', email: 'm31@example.test' });
        await assert.rejects(updateTeacherPersonalDetail('31', editPayload(31, { DOB: '1980-01-01T00:00:00.000Z' })), /Teacher #5/);
        assert.equal(detailOf(31).DOB.toISOString(), '1999-09-09T00:00:00.000Z');
    });

    it('allows a DOB change that only matches a DIFFERENT name, and a name change that only matches a different DOB', async () => {
        addTeacher(db, { id: 5, firstName: 'Other', lastName: 'Person', dob: '1980-01-01T00:00:00.000Z' });
        addTeacher(db, { id: 30, firstName: 'Mine', lastName: 'Identity', dob: '1999-09-09T00:00:00.000Z', email: 'mine@example.test' });
        await updateTeacherPersonalDetail('30', editPayload(30, { DOB: '1980-01-01T00:00:00.000Z' }));
        await updateTeacherPersonalDetail('30', editPayload(30, { firstName: 'Other', lastName: 'Person', DOB: '1975-05-05T00:00:00.000Z' }));
        assert.equal(detailOf(30).firstName, 'Other');
    });

    it('a changed phone that is shared is a WARNING and saves; an unchanged shared phone gives no warning', async () => {
        addTeacher(db, { id: 5, contact: '0466666666' });
        addTeacher(db, { id: 30, contact: '0400000001', email: 'mine@example.test' });
        const changed = await updateTeacherPersonalDetail('30', editPayload(30, { contact: '0466 666 666' }));
        assert.deepEqual(codes(changed), ['SHARED_PHONE']);
        assert.equal(detailOf(30).contact, '0466 666 666');
        const again = await updateTeacherPersonalDetail('30', editPayload(30, { contact: '0466 666 666', suburb: 'Elsewhere' }));
        assert.deepEqual(again.warnings, []);
    });

    it('does not block changing the email to the teacher\'s OWN login email, but blocks another teacher\'s login email', async () => {
        addTeacher(db, { id: 30, email: 'old@example.test' });
        addUser(db, { email: 'mine.login@example.test', role: 'TEACHER', teacherId: 30 });
        addUser(db, { email: 'someone.else@example.test', role: 'TEACHER', teacherId: 99 });
        await updateTeacherPersonalDetail('30', editPayload(30, { email: 'mine.login@example.test' }));
        await assert.rejects(updateTeacherPersonalDetail('30', editPayload(30, { email: 'someone.else@example.test' })), (error) => {
            assert.equal(error.toResponse().conflicts[0].kind, 'LOGIN_EMAIL');
            return true;
        });
    });

    it('email moved to a family email: allowed with warnings; the login email is NOT changed and the mismatch is flagged', async () => {
        addTeacher(db, { id: 30, email: 'old@example.test' });
        addUser(db, { email: 'old@example.test', role: 'TEACHER', teacherId: 30 });
        addStudent(db, { id: 5445, email: 'family@example.test' });
        addUser(db, { email: 'family@example.test', role: 'STUDENT', studentId: 5445 });
        const result = await updateTeacherPersonalDetail('30', editPayload(30, { email: 'family@example.test' }));
        assert.deepEqual(codes(result).sort(), ['LOGIN_EMAIL_MISMATCH', 'SHARED_STUDENT_EMAIL', 'STUDENT_LOGIN_ON_EMAIL']);
        assert.equal(db.state.users.find((u) => u.teacherId === 30).email, 'old@example.test');
    });

    it('possible-duplicate warning appears when an edit introduces a similar name at the same address', async () => {
        addTeacher(db, { id: 47, firstName: 'Manjit', lastName: 'Singh', address: '28 Riverside Drive', postcode: '3977', dob: '1978-08-05T14:00:00Z' });
        addTeacher(db, { id: 41, firstName: 'Someone', lastName: 'Different', address: '28 Riverside Drive', postcode: '3977', dob: '1979-08-04T14:00:00Z', email: 'm41@example.test' });
        const result = await updateTeacherPersonalDetail('41', editPayload(41, { firstName: 'Xxxx Manjit', lastName: 'Singh xxxx' }));
        assert.deepEqual(codes(result), ['POSSIBLE_DUPLICATE']);
    });

    it('rejects an invalid DOB (400) and an unknown teacher (404)', async () => {
        addTeacher(db, { id: 30 });
        await rejectsWith(updateTeacherPersonalDetail('30', editPayload(30, { DOB: 'nope' })), 'Please provide a valid date of birth.', 400);
        await rejectsWith(updateTeacherPersonalDetail('9999', editPayload(30, { id: '9999' })), 'Teacher not found', 404);
    });

    it('enforced by the BACKEND controller: duplicate -> 409 with the reason; success -> 200; unknown -> 404; invalid DOB -> 400', async () => {
        addTeacher(db, { id: 5, email: 'taken@example.test' });
        addTeacher(db, { id: 30, email: 'mine@example.test' });
        let res = fakeResponse();
        await updateTeacherPersonalDetailHandler({ params: { id: '30' }, body: { data: editPayload(30, { email: 'taken@example.test' }) } }, res);
        assert.equal(res.statusCode, 409);
        assert.match(res.body.message, /Teacher #5/);
        res = fakeResponse();
        await updateTeacherPersonalDetailHandler({ params: { id: '30' }, body: { data: editPayload(30, { suburb: 'Fine' }) } }, res);
        assert.equal(res.statusCode, 200);
        res = fakeResponse();
        await updateTeacherPersonalDetailHandler({ params: { id: '9999' }, body: { data: editPayload(30, { id: '9999' }) } }, res);
        assert.equal(res.statusCode, 404);
        res = fakeResponse();
        await updateTeacherPersonalDetailHandler({ params: { id: '30' }, body: { data: editPayload(30, { DOB: 'nope' }) } }, res);
        assert.equal(res.statusCode, 400);
    });

    it('two simultaneous edits that would create the same identity: only one succeeds', async () => {
        addTeacher(db, { id: 30, firstName: 'Alpha', lastName: 'One', dob: '1980-01-01T00:00:00.000Z', email: 'a@example.test' });
        addTeacher(db, { id: 31, firstName: 'Beta', lastName: 'Two', dob: '1980-01-01T00:00:00.000Z', email: 'b@example.test' });
        const results = await Promise.allSettled([
            updateTeacherPersonalDetail('30', editPayload(30, { firstName: 'Shared', lastName: 'Identity' })),
            updateTeacherPersonalDetail('31', editPayload(31, { firstName: 'Shared', lastName: 'Identity' }))
        ]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    });
});

/* ---------- helpers ---------- */
function fakeResponse() {
    return {
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
    };
}
