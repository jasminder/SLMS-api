/**
 * Issue 10 (mocked, no database): the REAL endEnrollmentWithHistory is run against a recording stand-in for a transaction client.
 * It proves the ORDER of operations (history, then archive, then a completeness check, and only then the deletes) and what is
 * stored. Atomicity itself (all-or-nothing) is provided by the surrounding database transaction and needs a real database to prove.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createLoader } from './helpers/load.mjs';

globalThis.__TEST_DB__ = {};
const load = createLoader(['service/admin.service/admin.enrollment.history.service/enrollment.history.service.ts']);
const { endEnrollmentWithHistory } = await load('service/admin.service/admin.enrollment.history.service/enrollment.history.service.ts');

const attendance = (id, status, extra = {}) => ({ id, date: new Date(`2026-03-0${id}T00:00:00Z`), attendanceStatus: status, remarks: 'r', schoolCheckInAttendanceId: 500 + id, schoolDayId: 9, ...extra });
const subjectEnrollment = (overrides = {}) => ({
    id: 31,
    termSubjectId: 11,
    termSubject: { subject: { id: 3, name: 'Kirtan' } },
    enrollment: {
        id: 21,
        createdAt: new Date('2026-02-01T01:00:00Z'),
        student: { role: 'STUDENT', isActive: true },
        termSubjectGroup: { id: 2, term: { id: 1, name: 'Term A' }, subjectGroup: { groupName: 'Kirtan' } },
        studentClassAssignment: [
            {
                id: 41,
                termSubjectLevelId: 51,
                sectionId: 61,
                isCurrentlyAssigned: true,
                changeDate: new Date('2026-02-02T00:00:00Z'),
                section: { id: 61, name: 'Section A' },
                termSubjectLevel: { level: { name: 'Level 1' }, subject: { id: 3, name: 'Kirtan' }, term: { id: 1, name: 'Term A' } },
                classAttendance: [attendance(1, 'PRESENT'), attendance(2, 'ABSENT')]
            }
        ],
        ...overrides
    },
    ...{}
});

let calls;
let archivedCountToReturn;
let found;
let remaining;
const tx = {
    subjectEnrollment: {
        async findFirst() {
            calls.push('subjectEnrollment.findFirst');
            return found;
        },
        async delete({ where }) {
            calls.push(`subjectEnrollment.delete:${where.id}`);
        }
    },
    enrollment: {
        async count() {
            calls.push('enrollment.count');
            return remaining;
        },
        async delete({ where }) {
            calls.push(`enrollment.delete:${where.id}`);
        }
    },
    enrollmentHistory: {
        async create({ data }) {
            calls.push('enrollmentHistory.create');
            tx.lastHistory = data;
            return { id: 77 };
        }
    },
    classAttendanceArchive: {
        async createMany({ data, skipDuplicates }) {
            calls.push('archive.createMany');
            tx.lastArchive = { data, skipDuplicates };
        },
        async count() {
            calls.push('archive.count');
            return archivedCountToReturn;
        }
    }
};
beforeEach(() => {
    calls = [];
    archivedCountToReturn = 2;
    found = subjectEnrollment();
    remaining = 1;
});
const run = (extra = {}) => endEnrollmentWithHistory(tx, { studentId: 5, item: { termSubjectGroupId: 2, termSubjectId: 11, subject: 'Kirtan' }, source: 'ACTIVE_STUDENT', actor: { userId: 7, email: 'admin@example.test' }, ...extra });

describe('endEnrollmentWithHistory', () => {
    it('writes the history FIRST, archives the attendance, checks the copy, and only then deletes (subject enrolment, then enrolment)', async () => {
        await run();
        assert.deepEqual(calls, ['subjectEnrollment.findFirst', 'enrollment.count', 'enrollmentHistory.create', 'archive.createMany', 'archive.count', 'subjectEnrollment.delete:31', 'enrollment.delete:21']);
    });

    it('stores who, when, what and the start date (the enrolment row\'s own creation time) in the history', async () => {
        const ended = await run();
        const h = tx.lastHistory;
        assert.deepEqual([h.studentId, h.enrollmentId, h.subjectEnrollmentId, h.termId, h.termName, h.termSubjectGroupId, h.groupName, h.subjectId, h.subjectName], [5, 21, 31, 1, 'Term A', 2, 'Kirtan', 3, 'Kirtan']);
        assert.equal(h.enrolledAt.toISOString(), '2026-02-01T01:00:00.000Z');
        assert.deepEqual([h.endedByUserId, h.endedByEmail, h.source, h.studentRoleAtEnd, h.studentIsActiveAtEnd], [7, 'admin@example.test', 'ACTIVE_STUDENT', 'STUDENT', true]);
        assert.equal(h.remainingInGroup, 1);
        assert.equal(h.attendanceArchivedCount, 2);
        assert.deepEqual(h.classAssignments[0], { assignmentId: 41, termSubjectLevelId: 51, subjectName: 'Kirtan', levelName: 'Level 1', sectionId: 61, sectionName: 'Section A', isCurrentlyAssigned: true, changeDate: new Date('2026-02-02T00:00:00Z'), attendanceRows: 2 });
        assert.deepEqual(ended, { enrollmentHistoryId: 77, enrollmentId: 21, subjectName: 'Kirtan', termSubjectGroupId: 2, studentId: 5, remainingInGroup: 1, attendanceArchived: 2 });
    });

    it('each attendance row is archived with date, status, remarks, class details and a link to the history; duplicates are skipped by the database', async () => {
        await run();
        assert.equal(tx.lastArchive.skipDuplicates, true);
        assert.equal(tx.lastArchive.data.length, 2);
        assert.deepEqual(tx.lastArchive.data[1], {
            enrollmentHistoryId: 77, studentId: 5, classAttendanceId: 2, studentClassAssignmentId: 41, schoolCheckInAttendanceId: 502, schoolDayId: 9,
            date: new Date('2026-03-02T00:00:00Z'), attendanceStatus: 'ABSENT', remarks: 'r', termId: 1, termName: 'Term A', termSubjectLevelId: 51, subjectId: 3,
            subjectName: 'Kirtan', levelName: 'Level 1', sectionId: 61, sectionName: 'Section A', assignmentWasCurrent: true
        });
    });

    it('if the archive is incomplete NOTHING is deleted (the error makes the surrounding transaction roll back)', async () => {
        archivedCountToReturn = 1; // one row missing
        await assert.rejects(run(), /Attendance archive incomplete.*Nothing was de-enrolled/);
        assert.ok(!calls.some((c) => c.includes('.delete:')), calls.join());
    });

    it('not enrolled in that subject: returns null and writes nothing (the flow raises its own error)', async () => {
        found = null;
        assert.equal(await run(), null);
        assert.deepEqual(calls, ['subjectEnrollment.findFirst']);
    });

    it('a student with no class attendance still gets a history row; no archive call is made', async () => {
        found = subjectEnrollment();
        found.enrollment.studentClassAssignment[0].classAttendance = [];
        const ended = await run();
        assert.equal(ended.attendanceArchived, 0);
        assert.ok(!calls.includes('archive.createMany'));
        assert.ok(calls.includes('enrollment.delete:21'));
    });

    it('attendance from INACTIVE (soft-removed) class assignments of the same enrolment is archived too', async () => {
        found = subjectEnrollment();
        found.enrollment.studentClassAssignment.push({ ...found.enrollment.studentClassAssignment[0], id: 42, isCurrentlyAssigned: false, classAttendance: [attendance(3, 'LATE')] });
        archivedCountToReturn = 3;
        const ended = await run();
        assert.equal(ended.attendanceArchived, 3);
        assert.equal(tx.lastArchive.data.find((r) => r.classAttendanceId === 3).assignmentWasCurrent, false);
    });

    it('the actor defaults to "System" when nobody is signed in, and the last subject of a group reports 0 remaining', async () => {
        remaining = 0;
        await run({ actor: undefined });
        assert.deepEqual([tx.lastHistory.endedByEmail, tx.lastHistory.endedByUserId, tx.lastHistory.remainingInGroup], ['System', null, 0]);
    });
});

describe('all five de-enrolment flows use it, inside one transaction, and nothing deletes enrolments directly any more (static check)', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
    const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
    const fn = (source, name) => {
        const start = source.indexOf(`export async function ${name}(`);
        assert.ok(start >= 0, name);
        return source.slice(start, source.indexOf('\n}\n', start));
    };
    const flows = [
        ['service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service.ts', 'deEnrollActiveStudent', 'ACTIVE_STUDENT'],
        ['service/admin.service/admin.student.service/admin.enrolled.student.service/admin.enrolled.student.service.ts', 'deEnrollStudentEnrolledToSubjects', 'ENROLLED_STUDENT'],
        ['service/admin.service/admin.student.service/admin.late.enrollments.service/admin.late.enrollments.service.ts', 'deEnrollStudentEnrolledToSubjects', 'LATE_ENROLLED_STUDENT'],
        ['service/admin.service/admin.alumni.service/admin.alumni.service.ts', 'deEnrollAlumniEnrolledToSubjects', 'ALUMNI'],
        ['service/admin.service/admin.enrollment.service/admin.enrollment.service.ts', 'deEnrollApplicant', 'APPLICANT']
    ];
    for (const [file, name, source] of flows) {
        it(`${source}: ${name} runs endEnrollmentWithHistory(..., source '${source}') inside db.$transaction and never deletes directly`, () => {
            const body = fn(read(file), name);
            assert.match(body, /await db\.\$transaction\(/);
            assert.match(body, new RegExp(`endEnrollmentWithHistory\\(tx, \\{[^}]*source: '${source}'`));
            assert.doesNotMatch(body, /db\.(enrollment|subjectEnrollment)\.delete/);
            assert.doesNotMatch(body, /feePayment\.deleteMany/);
            assert.match(body, /actor/);
        });
    }
    it('the applicant flow never deletes an invoice: it keeps the fee record whenever any invoice exists on it', () => {
        const body = fn(read(flows[4][0]), 'deEnrollApplicant');
        assert.match(body, /feePayment\.count/);
        assert.match(body, /invoiceCount === 0/);
        assert.match(body, /financialRecordsPreserved/);
    });
    it('no code path outside the history service deletes an enrolment any more', () => {
        const hits = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (entry.name.endsWith('.ts') && /(enrollment|subjectEnrollment)\.delete\(/.test(fs.readFileSync(full, 'utf8').replace(/^\s*\/\/.*$/gm, ''))) hits.push(path.relative(root, full));
            }
        };
        walk(root);
        assert.deepEqual(hits, ['service/admin.service/admin.enrollment.history.service/enrollment.history.service.ts']);
    });
    it('the four controllers that lacked an activity-log entry now write one, and every flow passes the signed-in admin as the actor', () => {
        for (const [file, handler] of [
            ['controller/admin.controller/admin.student.controller/admin.enrolled.student.controller/admin.enrolled.student.controller.ts', 'deEnrollStudentEnrolledToSubjectsHandler'],
            ['controller/admin.controller/admin.student.controller/admin.late.enrollments.controller/admin.late.enrollments.controller.ts', 'deEnrollStudentEnrolledToSubjectsHandler'],
            ['controller/admin.controller/admin.alumni.controller/admin.alumni.controller.ts', 'deEnrollAlumniEnrolledToSubjectsHandler'],
            ['controller/admin.controller/admin.enrollment.controller/admin.enrollment.controller.ts', 'deEnrollApplicantHandler'],
            ['controller/admin.controller/admin.student.controller/admin.active.students.controller/admin.active.students.controller.ts', 'deEnrollActiveStudentHandler']
        ]) {
            const source = read(file);
            const body = source.slice(source.indexOf(`export const ${handler}`), source.indexOf('\n};', source.indexOf(`export const ${handler}`)));
            assert.match(body, /userId: req\.user\?\.id, email: req\.user\?\.email/, handler);
            assert.match(body, /DE_ENROLLMENT/, handler);
        }
    });
    it('every de-enrolment route and both history read routes require a signed-in ADMIN (the enrolled-student one was open to anyone)', () => {
        const routes = [
            ['route/admin.route/admin.student.route/admin.enrolled.student.route/admin.enrolled.student.route.ts', "'/de-enroll-enrolled-student'"],
            ['route/admin.route/admin.student.route/admin.late.enrollments.route/admin.late.enrollments.route.ts', "'/de-enroll-late-enrolled-student'"],
            ['route/admin.route/admin.alumni.route/admin.alumni.route.ts', "'/de-enroll-alumni'"],
            ['route/admin.route/admin.enrollment.route/admin.enrollment.route.ts', "'/de-enroll-applicant'"],
            ['route/admin.route/admin.student.route/admin.active.student.route/admin.active.student.route.ts', "'/de-enroll-active-student'"],
            ['route/admin.route/admin.student.route/admin.active.student.route/admin.active.student.route.ts', "'/enrollment-history/:id'"],
            ['route/admin.route/admin.student.route/admin.active.student.route/admin.active.student.route.ts', "'/archived-class-attendance/:id'"]
        ];
        for (const [file, route] of routes) {
            const line = read(file).split('\n').find((l) => l.includes(`.route(${route})`));
            assert.ok(line, route);
            assert.match(line, /protectRoute, restrict\('ADMIN'\)/, route);
        }
    });
});
