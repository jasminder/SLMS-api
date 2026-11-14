/**
 * REAL-DATABASE integration test for Issues 9 and 10 (invoice eligibility + student history on de-enrolment).
 * Runs the REAL compiled services against a disposable local PostgreSQL that holds only the SYNTHETIC records created below.
 * Not part of `npm run test:unit`.
 *
 * SAFETY: refuses to run unless DATABASE_URL points at 127.0.0.1/localhost. It EMPTIES the school tables of that database
 * at the start (TRUNCATE ... CASCADE), so use a throw-away database only. Never run it against staging or production.
 *
 * Run from the SLMS-api folder after `npm run build`:
 *   DATABASE_URL=postgresql://user:pw@127.0.0.1:54329/slms_qa?schema=public node tests/integration/enrollment-history.integration.mjs
 * (the database must already have all migrations applied.)
 */
import { createRequire } from 'node:module';
import path from 'node:path';

const url = process.env.DATABASE_URL ?? '';
const host = (() => {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
})();
if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
    console.error(`REFUSING: DATABASE_URL host "${host}" is not local. This test empties tables.`);
    process.exit(2);
}
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { PrismaClient } = require('@prisma/client');
const dist = (p) => require(path.join(process.cwd(), 'dist/src/service', p));
const { createFeeTemplateAndPayments } = dist('admin.service/admin.fee.service/admin.fee.service.js');
const { deEnrollActiveStudent } = dist('admin.service/admin.student.service/admin.active.student.service/admin.active.student.service.js');
const { deEnrollStudentEnrolledToSubjects } = dist('admin.service/admin.student.service/admin.enrolled.student.service/admin.enrolled.student.service.js');
const { deEnrollStudentEnrolledToSubjects: deEnrollLate } = dist('admin.service/admin.student.service/admin.late.enrollments.service/admin.late.enrollments.service.js');
const { deEnrollAlumniEnrolledToSubjects } = dist('admin.service/admin.alumni.service/admin.alumni.service.js');
const { deEnrollApplicant } = dist('admin.service/admin.enrollment.service/admin.enrollment.service.js');
const { findStudentEnrollmentHistory, findArchivedClassAttendance } = dist('admin.service/admin.enrollment.history.service/enrollment.history.service.js');

const db = new PrismaClient();
const results = [];
const check = (section, name, ok, detail = '') => {
    results.push(!!ok);
    console.log(`${ok ? 'PASS' : 'FAIL'} [${section}] ${name}${detail ? ' — ' + String(detail).slice(0, 240) : ''}`);
};
const actor = { userId: 7, email: 'admin.qa@local.test' };
const rejects = async (promise) => {
    try {
        await promise;
        return null;
    } catch (error) {
        return error;
    }
};

/* ------------------------------ synthetic world ------------------------------ */
await db.$executeRawUnsafe(
    'TRUNCATE "Student","Term","Fee","SubjectGroup","Subject","Section","Level","SchoolDay","Notification","FeeTemplate" RESTART IDENTITY CASCADE'
);
const mkTerm = (name, start, end, current) => db.term.create({ data: { name, startDate: new Date(start), endDate: new Date(end), currentTerm: current, isPublish: true } });
const termA = await mkTerm('QA Term A 2026', '2026-01-25', '2026-12-13', true);
const termB = await mkTerm('QA Term B 2027', '2027-01-24', '2027-12-12', false);
const feeKirtan = await db.fee.create({ data: { amount: 50, paymentType: 'MONTHLY' } });
const feeVidyala = await db.fee.create({ data: { amount: 40, paymentType: 'MONTHLY' } });
const sgKirtan = await db.subjectGroup.create({ data: { groupName: 'QA Kirtan' } });
const sgVidyala = await db.subjectGroup.create({ data: { groupName: 'QA Gurmat Vidyala' } });
const subKirtan = await db.subject.create({ data: { name: 'QA Kirtan' } });
const subPunjabi = await db.subject.create({ data: { name: 'QA Punjabi' } });
const subGurmat = await db.subject.create({ data: { name: 'QA Gurmat' } });
const level = await db.level.create({ data: { name: 'QA Level 1' } });
const section = await db.section.create({ data: { name: 'QA Section A' } });
const world = {};
for (const [key, term] of [['A', termA], ['B', termB]]) {
    const tsgK = await db.termSubjectGroup.create({ data: { termId: term.id, feeId: feeKirtan.id, subjectGroupId: sgKirtan.id } });
    const tsgV = await db.termSubjectGroup.create({ data: { termId: term.id, feeId: feeVidyala.id, subjectGroupId: sgVidyala.id } });
    const mkTs = (group, subject) => db.termSubject.create({ data: { termId: term.id, termSubjectGroupId: group.id, subjectId: subject.id } });
    const mkTsl = (subject) => db.termSubjectLevel.create({ data: { termId: term.id, subjectId: subject.id, levelId: level.id } });
    world[key] = {
        term,
        kirtan: { group: tsgK, ts: await mkTs(tsgK, subKirtan), tsl: await mkTsl(subKirtan), name: 'QA Kirtan' },
        punjabi: { group: tsgV, ts: await mkTs(tsgV, subPunjabi), tsl: await mkTsl(subPunjabi), name: 'QA Punjabi' },
        gurmat: { group: tsgV, ts: await mkTs(tsgV, subGurmat), tsl: await mkTsl(subGurmat), name: 'QA Gurmat' }
    };
}
let nextId = 9000;
const mkStudent = async (akaalId, { role = 'STUDENT', isActive = true } = {}) => {
    const id = nextId++;
    await db.student.create({
        data: {
            id,
            akaalId,
            role,
            isActive,
            isAllowedLogin: true,
            personalDetails: { create: { firstName: `Syn${akaalId}`, lastName: 'Student', DOB: new Date('2014-06-01'), gender: 'male', email: `syn${akaalId}@example.test`, contact: '0400000000', address: '1 Test St', suburb: 'X', state: 'Victoria', postcode: '3000' } }
        }
    });
    return id;
};
const termFee = (studentId, subject) =>
    db.studentTermFee.upsert({
        where: { studentId_termSubjectGroupId_termId: { studentId, termSubjectGroupId: subject.group.id, termId: subject.group.termId } },
        update: {},
        create: { studentId, termSubjectGroupId: subject.group.id, termId: subject.group.termId },
        select: { id: true }
    });
/** An enrolment exactly as the app creates it (enrolment + subject enrolment + class assignment + fee record). */
const enroll = async (studentId, subject, createdAt = '2026-02-01T01:00:00Z') => {
    const enrollment = await db.enrollment.create({ data: { studentId, termSubjectGroupId: subject.group.id, createdAt: new Date(createdAt) } });
    const subjectEnrollment = await db.subjectEnrollment.create({ data: { enrollmentId: enrollment.id, termSubjectId: subject.ts.id } });
    await db.enrollment.update({ where: { id: enrollment.id }, data: { subjectEnrollmentId: subjectEnrollment.id } });
    const assignment = await db.studentClassAssignment.create({ data: { enrollmentId: enrollment.id, studentId, termSubjectLevelId: subject.tsl.id, sectionId: section.id } });
    await termFee(studentId, subject);
    return { enrollment, subjectEnrollment, assignment };
};
let dayNumber = 1;
const addAttendance = async (studentId, assignment, statuses) => {
    for (const status of statuses) {
        const date = new Date(Date.UTC(2026, 2, dayNumber++));
        const checkIn = await db.schoolCheckInAttendance.upsert({ where: { studentId_date: { studentId, date } }, update: {}, create: { studentId, date, checkedIn: true, isMarked: true } });
        await db.classAttendance.create({ data: { studentClassAssignmentId: assignment.id, date, attendanceStatus: status, schoolCheckInAttendanceId: checkIn.id, remarks: 'synthetic' } });
    }
};
const deEnrollItem = (subject) => ({ subject: subject.name, termSubjectGroupId: subject.group.id, subjectGroupId: subject.group.subjectGroupId, termId: subject.group.termId, feeId: subject.group.feeId, termSubjectId: subject.ts.id });
const generate = (monthName, ids, subject, label, extra = {}) =>
    createFeeTemplateAndPayments({
        studentIds: ids.map(String),
        interval: 'MONTHLY',
        invoiceName: `${subject.group.id}_${label ?? monthName}_2026`,
        notes: 'synthetic',
        month: monthName,
        year: '2026',
        termName: world.A.term.name,
        termId: String(subject.group.termId),
        termSubjectGroupName: subject === world.A.kirtan ? 'QA Kirtan' : 'QA Gurmat Vidyala',
        termSubjectGroupId: String(subject.group.id),
        dueDate: '2026-07-11T00:00:00.000Z',
        amount: String(subject === world.A.kirtan ? 50 : 40),
        ...extra
    });
const paymentsFor = (studentId, groupId) => db.feePayment.findMany({ where: { studentTermFee: { studentId, termSubjectGroupId: groupId } }, orderBy: { id: 'asc' } });
const notificationCount = (studentId) => db.notification.count({ where: { studentId } });
const counts = async (studentId) => ({
    school: await db.schoolCheckInAttendance.count({ where: { studentId } }),
    termFees: await db.studentTermFee.count({ where: { studentId } }),
    payments: await db.feePayment.count({ where: { studentTermFee: { studentId } } }),
    student: await db.student.count({ where: { id: studentId } })
});

/* =========================== Issue 10 + Issue 9 scenarios =========================== */
const K = world.A.kirtan;

// ---- 1. leaves the only subject (5041 Sundar Singh shape) ----
let S = '1 only subject';
const s1 = await mkStudent(5041);
const e1 = await enroll(s1, K);
await addAttendance(s1, e1.assignment, ['PRESENT', 'PRESENT', 'ABSENT']);
const june = await generate('june', [s1], K);
check(S, 'a June invoice is raised while he is enrolled', june.createdCount === 1 && june.skippedCount === 0, JSON.stringify({ c: june.createdCount, s: june.skippedCount }));
const before1 = await counts(s1);
const notifBefore1 = await notificationCount(s1);
const r1 = await deEnrollActiveStudent({ activeStudentId: s1, enrollData: [deEnrollItem(K)] }, actor);
const hist1 = await db.enrollmentHistory.findMany({ where: { studentId: s1 } });
check(S, 'de-enrolment succeeds and the response keeps its message + subject list', r1.message === 'De-enrollment process completed' && r1.deEnrolledSubjects[0] === 'QA Kirtan', JSON.stringify(r1.deEnrolledSubjects));
check(S, 'a history record exists: subject, term, fee group, who, when, source, start = the enrolment row\'s creation time', hist1.length === 1 && hist1[0].subjectName === 'QA Kirtan' && hist1[0].termName === 'QA Term A 2026' && hist1[0].groupName === 'QA Kirtan' && hist1[0].endedByEmail === actor.email && hist1[0].endedByUserId === 7 && hist1[0].source === 'ACTIVE_STUDENT' && hist1[0].enrolledAt?.toISOString() === '2026-02-01T01:00:00.000Z' && hist1[0].remainingInGroup === 0, JSON.stringify(hist1[0] && { s: hist1[0].subjectName, by: hist1[0].endedByEmail, src: hist1[0].source, rem: hist1[0].remainingInGroup }));
check(S, 'the live enrolment, subject enrolment, class assignment and class attendance are gone (as before)', (await db.enrollment.count({ where: { studentId: s1 } })) === 0 && (await db.subjectEnrollment.count({ where: { enrollment: { studentId: s1 } } })) === 0 && (await db.studentClassAssignment.count({ where: { studentId: s1 } })) === 0 && (await db.classAttendance.count({ where: { studentClassAssignment: { studentId: s1 } } })) === 0);

// ---- 6. historical attendance remains available ----
S = '6 attendance archive';
const arch1 = await db.classAttendanceArchive.findMany({ where: { studentId: s1 }, orderBy: { date: 'asc' } });
check(S, 'all 3 class attendance rows were archived with date, status, subject, level, section and term', arch1.length === 3 && arch1.map((a) => a.attendanceStatus).join() === 'PRESENT,PRESENT,ABSENT' && arch1.every((a) => a.subjectName === 'QA Kirtan' && a.levelName === 'QA Level 1' && a.sectionName === 'QA Section A' && a.termName === 'QA Term A 2026' && a.remarks === 'synthetic'), JSON.stringify(arch1.map((a) => a.attendanceStatus)));
check(S, 'the history row records how many were archived and links to them (no orphans)', hist1[0].attendanceArchivedCount === 3 && arch1.every((a) => a.enrollmentHistoryId === hist1[0].id));
const apiHistory = await findStudentEnrollmentHistory(s1);
const apiArchive = await findArchivedClassAttendance(s1, termA.id);
check(S, 'the admin read endpoints return the history and the archived attendance (newest first)', apiHistory.length === 1 && apiHistory[0].subjectName === 'QA Kirtan' && apiArchive.length === 3 && apiArchive[0].subjectName === 'QA Kirtan' && apiArchive[0].enrollmentHistory.endedAt instanceof Date);
check(S, 'a term filter works (another term returns nothing)', (await findArchivedClassAttendance(s1, termB.id)).length === 0);

// ---- 7/8. history is not "active"; student, fees, payments and daily attendance intact ----
S = '7-8 not active, nothing else lost';
const after1 = await counts(s1);
check(S, 'daily (school) check-in attendance, fee records, invoices and the student record are unchanged', JSON.stringify(before1) === JSON.stringify(after1), JSON.stringify({ before1, after1 }));
check(S, 'the ended subject is NOT among the current enrolments (history never appears as active)', (await db.enrollment.count({ where: { studentId: s1 } })) === 0 && apiHistory.every((h) => h.endedAt instanceof Date));
check(S, 'the June invoice is still there, unchanged (financial history is never deleted)', (await paymentsFor(s1, K.group.id)).length === 1);

// ---- 1 (invoice side) + 12 notifications ----
S = '1 + 12 no invoice after leaving, no notification';
const control = await mkStudent(5109);
await enroll(control, K);
const notifBeforeControl = await notificationCount(control);
const july = await generate('july', [s1, control], K);
const skipped1 = july.skipped.find((x) => x.studentId === s1);
check(S, 'July run: the student who left is SKIPPED (LEFT_FEE_GROUP) with the date, the enrolled student gets an invoice', july.createdCount === 1 && july.skippedCount === 1 && skipped1?.code === 'LEFT_FEE_GROUP' && /Left this fee group on/.test(skipped1.reason), JSON.stringify(july.skipped.map((x) => x.code)));
check(S, 'the skipped student has NO new invoice (only the June one) and the enrolled student has the July one', (await paymentsFor(s1, K.group.id)).length === 1 && (await paymentsFor(control, K.group.id)).length === 1);
check(S, 'NO invoice notification was created for the skipped student; exactly one for the billed student', (await notificationCount(s1)) === notifBefore1 && (await notificationCount(control)) === notifBeforeControl + 1);
check(S, 'the result carries counts, skipped list with names, Akaal id and reasons, plus the legacy skippedDeEnrolled field', july.requestedCount === 2 && skipped1.akaalId === 5041 && skipped1.name === 'Syn5041 Student' && july.skippedDeEnrolled.length === 1 && july.billingPeriod.label === 'July 2026');
check(S, 'a billing period that is not the current month is a warning, never a block', typeof july.periodWarning === 'string' && /past period|future period/.test(july.periodWarning), july.periodWarning);

// ---- 2. leaves Punjabi, stays in Gurmat (same fee group) ----
S = '2 same fee group';
const V = world.A;
const s2 = await mkStudent(5101);
const e2p = await enroll(s2, V.punjabi);
const e2g = await enroll(s2, V.gurmat);
await addAttendance(s2, e2p.assignment, ['PRESENT', 'PRESENT']);
await addAttendance(s2, e2g.assignment, ['PRESENT']);
await deEnrollActiveStudent({ activeStudentId: s2, enrollData: [deEnrollItem(V.punjabi)] }, actor);
const h2 = await db.enrollmentHistory.findMany({ where: { studentId: s2 } });
check(S, 'history shows Punjabi ended with 1 enrolment still left in the fee group', h2.length === 1 && h2[0].subjectName === 'QA Punjabi' && h2[0].remainingInGroup === 1 && h2[0].attendanceArchivedCount === 2);
check(S, 'the remaining Gurmat enrolment, its class assignment and its attendance are untouched', (await db.enrollment.count({ where: { studentId: s2 } })) === 1 && (await db.classAttendance.count({ where: { studentClassAssignment: { studentId: s2 } } })) === 1);
const jul2 = await generate('july', [s2], V.gurmat);
const pay2 = await paymentsFor(s2, V.gurmat.group.id);
check(S, 'the group fee CONTINUES, unchanged: invoiced $40 for July', jul2.createdCount === 1 && pay2.length === 1 && pay2[0].feeAmount === 40 && pay2[0].dueAmount === 40 && pay2[0].status === 'PENDING', JSON.stringify(pay2.map((p) => [p.feeAmount, p.status])));

// ---- 3. leaves every subject of the fee group ----
S = '3 all subjects of the group';
const s3 = await mkStudent(5102);
const e3p = await enroll(s3, V.punjabi);
await enroll(s3, V.gurmat);
await addAttendance(s3, e3p.assignment, ['PRESENT']);
await deEnrollActiveStudent({ activeStudentId: s3, enrollData: [deEnrollItem(V.punjabi), deEnrollItem(V.gurmat)] }, actor);
const h3 = await db.enrollmentHistory.findMany({ where: { studentId: s3 }, orderBy: { id: 'asc' } });
check(S, 'two history rows; the first leaves 1 in the group, the second leaves 0', h3.length === 2 && h3[0].remainingInGroup === 1 && h3[1].remainingInGroup === 0, JSON.stringify(h3.map((h) => h.remainingInGroup)));
const jul3 = await generate('july', [s3], V.gurmat, 'july_b');
check(S, 'no new invoice: skipped LEFT_FEE_GROUP, the whole run billed nobody and left no empty template behind', jul3.createdCount === 0 && jul3.skipped[0]?.code === 'LEFT_FEE_GROUP' && jul3.feeTemplate === null && (await db.feeTemplate.count({ where: { invoiceName: `${V.gurmat.group.id}_july_b_2026` } })) === 0, JSON.stringify(jul3.skipped.map((x) => x.code)));

// ---- 4. leaves and re-enrols in the same term ----
S = '4 re-enrol same term';
const s4 = await mkStudent(5103);
const e4 = await enroll(s4, K);
await addAttendance(s4, e4.assignment, ['PRESENT']);
await deEnrollActiveStudent({ activeStudentId: s4, enrollData: [deEnrollItem(K)] }, actor);
const e4b = await enroll(s4, K, new Date().toISOString());
await addAttendance(s4, e4b.assignment, ['PRESENT']);
await deEnrollActiveStudent({ activeStudentId: s4, enrollData: [deEnrollItem(K)] }, actor);
const h4 = await db.enrollmentHistory.findMany({ where: { studentId: s4 }, orderBy: { id: 'asc' } });
check(S, 'leaving twice gives two separate history rows (different enrolment ids) and both attendance archives are kept', h4.length === 2 && h4[0].enrollmentId !== h4[1].enrollmentId && (await db.classAttendanceArchive.count({ where: { studentId: s4 } })) === 2);
await enroll(s4, K, new Date().toISOString());
check(S, 're-enrolling afterwards works (no unique-constraint clash with the ended enrolments)', (await db.enrollment.count({ where: { studentId: s4 } })) === 1);

// ---- 5. leaves, re-enrols in a later term ----
S = '5 re-enrol later term';
const s5 = await mkStudent(5104);
await enroll(s5, K);
await deEnrollActiveStudent({ activeStudentId: s5, enrollData: [deEnrollItem(K)] }, actor);
await enroll(s5, world.B.kirtan, '2027-01-20T00:00:00Z');
const termAInvoice = await generate('august', [s5], K, 'august');
check(S, 'term A (left): skipped', termAInvoice.createdCount === 0 && termAInvoice.skipped[0]?.code === 'LEFT_FEE_GROUP');
const termBInvoice = await createFeeTemplateAndPayments({ studentIds: [String(s5)], interval: 'MONTHLY', invoiceName: 'termB_feb_2027', notes: 'n', month: 'february', year: '2027', termName: termB.name, termId: String(termB.id), termSubjectGroupName: 'QA Kirtan', termSubjectGroupId: String(world.B.kirtan.group.id), dueDate: '2027-02-11T00:00:00.000Z', amount: '50' });
check(S, 'term B (enrolled again): billed normally', termBInvoice.createdCount === 1 && (await paymentsFor(s5, world.B.kirtan.group.id)).length === 1);

// ---- gap rule, driven by history timestamps (synthetic: simulate the passage of time) ----
S = '4b gap inside one term';
const s11 = await mkStudent(5111);
const e11 = await enroll(s11, K, '2026-02-01T01:00:00Z');
await deEnrollActiveStudent({ activeStudentId: s11, enrollData: [deEnrollItem(K)] }, actor);
await db.enrollmentHistory.updateMany({ where: { studentId: s11 }, data: { endedAt: new Date('2026-06-14T04:00:00Z') } }); // left 14 June
await enroll(s11, K, '2026-08-01T01:00:00Z'); // came back 1 August
const gapJuly = await generate('july', [s11], K, 'gap_july');
check(S, 'July (inside the proven gap) is skipped NOT_ENROLLED_IN_BILLING_PERIOD with both dates', gapJuly.createdCount === 0 && gapJuly.skipped[0]?.code === 'NOT_ENROLLED_IN_BILLING_PERIOD' && /left on 14 Jun 2026 and enrolled again on 1 Aug 2026/.test(gapJuly.skipped[0].reason), gapJuly.skipped[0]?.reason);
const gapAug = await generate('august', [s11], K, 'gap_august');
check(S, 'August (the month he came back) is billed', gapAug.createdCount === 1);

// ---- legacy case: left before history was kept (the 4 July pattern) ----
S = 'legacy no-history case';
const s6 = await mkStudent(5105);
await termFee(s6, K); // fee record kept, enrolment deleted by the OLD code, no history
const jul6 = await generate('july', [s6], K, 'legacy_july');
check(S, 'skipped NO_ENROLLMENT_NO_HISTORY with an explicit "date unknown" (nothing invented)', jul6.createdCount === 0 && jul6.skipped[0]?.code === 'NO_ENROLLMENT_NO_HISTORY' && /date they left is unknown/.test(jul6.skipped[0].reason));

// ---- enrolled / late-enrolled / alumni flows ----
S = 'other de-enrol flows';
const s12 = await mkStudent(5112);
await enroll(s12, V.punjabi);
await enroll(s12, V.gurmat);
const errMin = await rejects(deEnrollStudentEnrolledToSubjects({ enrolledStudentId: s12, enrollData: [deEnrollItem(V.punjabi), deEnrollItem(V.gurmat)] }, actor));
check(S, 'enrolled flow keeps its "at least one subject" rule (400) and changes nothing', errMin?.statusCode === 400 && /at least one subject/.test(errMin.message) && (await db.enrollment.count({ where: { studentId: s12 } })) === 2 && (await db.enrollmentHistory.count({ where: { studentId: s12 } })) === 0);
await deEnrollStudentEnrolledToSubjects({ enrolledStudentId: s12, enrollData: [deEnrollItem(V.punjabi)] }, actor);
check(S, 'enrolled flow: one subject can leave; source ENROLLED_STUDENT recorded', (await db.enrollmentHistory.findFirst({ where: { studentId: s12 } }))?.source === 'ENROLLED_STUDENT');
const s13 = await mkStudent(5113);
await enroll(s13, V.punjabi);
await enroll(s13, V.gurmat);
const errLate = await rejects(deEnrollLate({ enrolledStudentId: s13, enrollData: [deEnrollItem(V.punjabi), deEnrollItem(V.gurmat)] }, actor));
check(S, 'late-enrolled flow keeps its rule (404 as before)', errLate?.statusCode === 404);
await deEnrollLate({ enrolledStudentId: s13, enrollData: [deEnrollItem(V.gurmat)] }, actor);
check(S, 'late-enrolled flow: history with source LATE_ENROLLED_STUDENT', (await db.enrollmentHistory.findFirst({ where: { studentId: s13 } }))?.source === 'LATE_ENROLLED_STUDENT');
const s14 = await mkStudent(5114, { role: 'ALUMNI', isActive: false });
const e14 = await enroll(s14, K);
await addAttendance(s14, e14.assignment, ['PRESENT', 'LATE']);
await deEnrollAlumniEnrolledToSubjects({ alumniId: s14, enrollData: [deEnrollItem(K)] }, actor);
const h14 = await db.enrollmentHistory.findFirst({ where: { studentId: s14 } });
check(S, 'alumni flow: history (ALUMNI, role + inactive recorded) and attendance archived', h14?.source === 'ALUMNI' && h14.studentRoleAtEnd === 'ALUMNI' && h14.studentIsActiveAtEnd === false && (await db.classAttendanceArchive.count({ where: { studentId: s14 } })) === 2);

// ---- 9. applicant: financial records are never destroyed ----
S = '9 applicant financial records';
const s7 = await mkStudent(5106, { role: 'APPLICANT', isActive: false });
await enroll(s7, K);
const stf7 = await termFee(s7, K);
const tmpl = await db.feeTemplate.create({ data: { invoiceName: 'applicant_invoice', groupName: 'QA Kirtan', month: 'march', year: '2026', termName: termA.name, termId: termA.id, termSubjectGroupId: K.group.id, amount: 50, dueDate: new Date('2026-03-11'), interval: 'MONTHLY' } });
const pay7 = await db.feePayment.create({ data: { invoiceId: '51061', studentTermFeeId: stf7.id, feeTemplateId: tmpl.id, dueDate: new Date('2026-03-11'), dueAmount: 50, feeAmount: 50, adjustedFeeAmount: 50, status: 'PENDING' } });
await db.paymentInstallment.create({ data: { feePaymentId: pay7.id, paidAmount: 20, paymentMethod: 'CASH', paymentStatus: 'PAID' } });
const rApplicant = await deEnrollApplicant({ applicantId: s7, enrollData: [deEnrollItem(K)] }, actor);
check(S, 'applicant with an invoice and a payment: invoice, payment and fee record ALL still exist', (await db.feePayment.count({ where: { id: pay7.id } })) === 1 && (await db.paymentInstallment.count({ where: { feePaymentId: pay7.id } })) === 1 && (await db.studentTermFee.count({ where: { id: stf7.id } })) === 1);
check(S, 'the response says the financial records were preserved (so it is visible, not silent)', rApplicant.financialRecordsPreserved?.length === 1 && rApplicant.financialRecordsPreserved[0].invoices === 1);
check(S, 'applicant history recorded with source APPLICANT', (await db.enrollmentHistory.findFirst({ where: { studentId: s7 } }))?.source === 'APPLICANT');
const s8 = await mkStudent(5107, { role: 'APPLICANT', isActive: false });
await enroll(s8, K);
await deEnrollApplicant({ applicantId: s8, enrollData: [deEnrollItem(K)] }, actor);
check(S, 'applicant with NO invoice: the empty fee placeholder is removed exactly as before (existing behaviour kept)', (await db.studentTermFee.count({ where: { studentId: s8 } })) === 0 && (await db.enrollmentHistory.count({ where: { studentId: s8 } })) === 1);

// ---- 16. rollback: a failure leaves everything exactly as it was ----
S = '16 rollback';
const s9 = await mkStudent(5115);
const e9a = await enroll(s9, V.punjabi);
const e9b = await enroll(s9, V.gurmat);
await addAttendance(s9, e9a.assignment, ['PRESENT', 'ABSENT']);
await addAttendance(s9, e9b.assignment, ['PRESENT']);
const snapshot = async () => ({ enr: await db.enrollment.count({ where: { studentId: s9 } }), se: await db.subjectEnrollment.count({ where: { enrollment: { studentId: s9 } } }), sca: await db.studentClassAssignment.count({ where: { studentId: s9 } }), att: await db.classAttendance.count({ where: { studentClassAssignment: { studentId: s9 } } }), hist: await db.enrollmentHistory.count({ where: { studentId: s9 } }), arch: await db.classAttendanceArchive.count({ where: { studentId: s9 } }) });
const snap0 = await snapshot();
const errSecond = await rejects(deEnrollActiveStudent({ activeStudentId: s9, enrollData: [deEnrollItem(V.punjabi), deEnrollItem(K)] }, actor)); // 2nd item: not enrolled
check(S, 'second subject not enrolled -> the whole request is rejected (400) and the FIRST subject is NOT removed either', errSecond?.statusCode === 400 && JSON.stringify(await snapshot()) === JSON.stringify(snap0), JSON.stringify(await snapshot()));
// force a failure in the middle of the second item: a history row already exists for that enrolment id (unique violation)
await db.enrollmentHistory.create({ data: { studentId: s9, enrollmentId: e9b.enrollment.id, termId: termA.id, termName: 'x', termSubjectGroupId: V.gurmat.group.id, groupName: 'x', subjectName: 'x', endedByEmail: 'x', source: 'ACTIVE_STUDENT' } });
const snap1 = await snapshot();
const errMid = await rejects(deEnrollActiveStudent({ activeStudentId: s9, enrollData: [deEnrollItem(V.punjabi), deEnrollItem(V.gurmat)] }, actor));
const snap2 = await snapshot();
check(S, 'a database failure in the middle of the request rolls EVERYTHING back (enrolments, assignments, attendance, history, archive)', !!errMid && JSON.stringify(snap1) === JSON.stringify(snap2), JSON.stringify({ snap1, snap2 }));

// ---- 10. invalid students and duplicate invoices never corrupt a batch ----
S = '10 batch safety';
const sOk = await mkStudent(5120);
await enroll(sOk, K);
const sNoFee = await mkStudent(5121);
await db.enrollment.create({ data: { studentId: sNoFee, termSubjectGroupId: K.group.id } }); // enrolled but no fee record
const sNoAkaal = await db.student.create({ data: { id: nextId++, role: 'STUDENT', isActive: true, akaalId: null, personalDetails: { create: { firstName: 'Noakaal', lastName: 'Id', DOB: new Date('2014-01-01'), gender: 'male', email: 'noakaal@example.test', contact: '0400000000', address: 'a', suburb: 's', state: 'v', postcode: '3000' } } } });
await enroll(sNoAkaal.id, K);
const mixed = await generate('september', [sOk, sNoFee, sNoAkaal.id, 987654321, s1], K, 'sept');
const codes = mixed.skipped.map((x) => x.code).sort();
check(S, 'one batch with several bad students: the good student is still billed; each bad one is skipped with its own reason', mixed.createdCount === 1 && mixed.skippedCount === 4 && codes.join() === ['LEFT_FEE_GROUP', 'NO_AKAAL_ID', 'NO_FEE_RECORD', 'STUDENT_NOT_FOUND'].sort().join(), codes.join());
const againPayments = await generate('september', [sOk, sNoFee], K, 'sept');
check(S, 'running the same template again never duplicates a charge (ALREADY_BILLED, no second payment)', againPayments.createdCount === 0 && againPayments.skipped.find((x) => x.studentId === sOk)?.code === 'ALREADY_BILLED' && (await paymentsFor(sOk, K.group.id)).length === 1);
const raceStudent = await mkStudent(5122);
await enroll(raceStudent, K);
const race = await Promise.all([generate('october', [raceStudent], K, 'oct'), generate('october', [raceStudent], K, 'oct')]);
check(S, 'two simultaneous identical requests create exactly ONE invoice for the student (advisory lock)', race.reduce((n, r) => n + r.createdCount, 0) === 1 && (await paymentsFor(raceStudent, K.group.id)).length === 1, JSON.stringify(race.map((r) => [r.createdCount, r.skipped.map((x) => x.code)])));
const badMonth = await rejects(generate('Julyy', [sOk], K, 'bad'));
const badYear = await rejects(createFeeTemplateAndPayments({ studentIds: [String(sOk)], interval: 'MONTHLY', invoiceName: 'x', notes: 'n', month: 'july', year: '26', termName: 't', termId: String(termA.id), termSubjectGroupName: 'g', termSubjectGroupId: String(K.group.id), dueDate: '2026-07-11', amount: '50' }));
const badDue = await rejects(generate('july', [sOk], K, 'baddue', { dueDate: 'not a date' }));
const badAmount = await rejects(generate('july', [sOk], K, 'badamount', { amount: '50.5' }));
check(S, 'bad month / year / due date / amount from the browser are rejected with 400 before anything is created', [badMonth, badYear, badDue, badAmount].every((e) => e?.statusCode === 400) && (await db.feeTemplate.count({ where: { invoiceName: { in: ['x', `${K.group.id}_bad_2026`] } } })) === 0);
check(S, 'a duplicated id in the selection is billed once', (await generate('november', [sOk, sOk, sOk], K, 'nov')).createdCount === 1);

// ---- the existing student-list consistency (Issue 9 #4) ----
S = '4 lists match generation';
const { findActiveStudentsForFeeCreation, defaultSelectActiveStudentsForFeeCreation, searchActiveStudentsForFeeCreation, selectActiveStudentsForFeeCreation } = dist('admin.service/admin.fee.service/admin.fee.service.js');
const lists = {
    find: await findActiveStudentsForFeeCreation(0, termA.id),
    default: await defaultSelectActiveStudentsForFeeCreation(0, termA.id),
    search: await searchActiveStudentsForFeeCreation('', 0, termA.id, K.group.id),
    select: await selectActiveStudentsForFeeCreation('', 0, termA.id, K.group.id)
};
const idsIn = (l) => new Set(l.activeStudents.map((x) => x.id));
check(S, 'a student who left (5041) is in NONE of the four lists; an enrolled Kirtan student is in all four of the group lists', [lists.find, lists.default, lists.search, lists.select].every((l) => !idsIn(l).has(s1)) && idsIn(lists.search).has(control) && idsIn(lists.select).has(control), JSON.stringify(Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.count]))));
check(S, 'the counts of the two unfiltered lists now equal the filtered ones (same rule everywhere)', lists.find.count === lists.default.count);

// ---- 14. term rollover: unchanged, no duplicated balances ----
S = '14 term rollover';
try {
    const { makeCurrentTerm } = dist('admin.service/admin.administration.service/admin.administration.service.js');
    await db.studentTermFee.upsert({ where: { studentId_termSubjectGroupId_termId: { studentId: control, termSubjectGroupId: K.group.id, termId: termA.id } }, update: {}, create: { studentId: control, termSubjectGroupId: K.group.id, termId: termA.id } });
    await makeCurrentTerm(String(termB.id));
    const prev = await db.feePayment.findMany({ where: { invoiceId: { startsWith: 'PREV_' } }, include: { studentTermFee: true } });
    const perKey = new Map();
    for (const p of prev) perKey.set(`${p.studentTermFee.studentId}_${p.studentTermFee.termSubjectGroupId}`, (perKey.get(`${p.studentTermFee.studentId}_${p.studentTermFee.termSubjectGroupId}`) ?? 0) + 1);
    check(S, 'rollover creates at most ONE carried-forward balance per student and fee group (no duplicates)', prev.length > 0 && [...perKey.values()].every((n) => n === 1), `rows=${prev.length}`);
    const unpaidBefore = await db.feePayment.count({ where: { studentTermFee: { studentId: control, termId: termA.id }, status: 'PENDING' } });
    check(S, 'the original term A invoices were left as they were (existing behaviour, not changed by this work)', unpaidBefore >= 1);
    const carriedLeft = prev.some((p) => p.studentTermFee.studentId === s1);
    console.log(`INFO  [${S}] a student who left (5041) with an unpaid June invoice ${carriedLeft ? 'IS' : 'is not'} carried forward by the existing rollover (documented risk, intentionally not changed)`);
} catch (error) {
    check(S, 'term rollover ran on the synthetic data', false, error.message);
}

console.log(`\nSUMMARY ${results.filter(Boolean).length}/${results.length} passed`);
await db.$disconnect();
process.exit(results.every(Boolean) ? 0 : 1);
