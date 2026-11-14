import type { Prisma } from '@prisma/client';
import { db } from '../../../utils/db.server';

/**
 * Issue 10: leaving a subject must END that enrolment only. The student, their fee history, their daily (school) attendance
 * and their activity record stay, and the class attendance for the term they attended must stay reportable.
 *
 * `endEnrollmentWithHistory` is the single place that removes a subject enrolment. Inside the caller's transaction it
 *   1. writes a permanent EnrollmentHistory row (who, when, which subject/term/fee group, when the enrolment began),
 *   2. copies every ClassAttendance row of the enrolment's class assignments into ClassAttendanceArchive,
 *   3. checks the copy is complete, and only then
 *   4. deletes the live SubjectEnrollment and Enrollment (the database cascade then removes the class assignments and
 *      the original attendance rows, which are now safely archived).
 * Because it runs in one transaction, history + archive + delete succeed or fail together: a failure leaves the enrolment
 * and its attendance exactly as they were.
 */

export type DeEnrollSource = 'ACTIVE_STUDENT' | 'ENROLLED_STUDENT' | 'LATE_ENROLLED_STUDENT' | 'ALUMNI' | 'APPLICANT';
export type DeEnrollActor = { userId?: number | null; email?: string | null };
export type DeEnrollItem = { termSubjectGroupId: number; termSubjectId: number; subject?: string };

export type EndedEnrollment = {
    enrollmentHistoryId: number;
    enrollmentId: number;
    subjectName: string;
    termSubjectGroupId: number;
    studentId: number;
    remainingInGroup: number;
    attendanceArchived: number;
};

type Tx = Prisma.TransactionClient;

/** Returns null when the student is not enrolled in that subject (the caller raises its own, flow-specific error). */
export async function endEnrollmentWithHistory(
    tx: Tx,
    input: { studentId: number; item: DeEnrollItem; source: DeEnrollSource; actor?: DeEnrollActor }
): Promise<EndedEnrollment | null> {
    const { studentId, item, source } = input;
    const subjectEnrollment = await tx.subjectEnrollment.findFirst({
        where: { termSubjectId: item.termSubjectId, enrollment: { studentId, termSubjectGroupId: item.termSubjectGroupId } },
        include: {
            termSubject: { include: { subject: { select: { id: true, name: true } } } },
            enrollment: {
                include: {
                    student: { select: { role: true, isActive: true } },
                    termSubjectGroup: { include: { term: { select: { id: true, name: true } }, subjectGroup: { select: { groupName: true } } } },
                    studentClassAssignment: {
                        include: {
                            classAttendance: true,
                            section: { select: { id: true, name: true } },
                            termSubjectLevel: { include: { level: { select: { name: true } }, subject: { select: { id: true, name: true } }, term: { select: { id: true, name: true } } } }
                        }
                    }
                }
            }
        }
    });
    if (!subjectEnrollment) return null;

    const enrollment = subjectEnrollment.enrollment;
    const group = enrollment.termSubjectGroup;
    const subjectName = subjectEnrollment.termSubject.subject.name;
    const remainingInGroup = await tx.enrollment.count({ where: { studentId, termSubjectGroupId: group.id, id: { not: enrollment.id } } });

    const attendanceRows = enrollment.studentClassAssignment.flatMap((assignment) =>
        assignment.classAttendance.map((attendance) => ({ assignment, attendance }))
    );
    const classAssignments = enrollment.studentClassAssignment.map((assignment) => ({
        assignmentId: assignment.id,
        termSubjectLevelId: assignment.termSubjectLevelId,
        subjectName: assignment.termSubjectLevel.subject.name,
        levelName: assignment.termSubjectLevel.level.name,
        sectionId: assignment.sectionId,
        sectionName: assignment.section.name,
        isCurrentlyAssigned: assignment.isCurrentlyAssigned,
        changeDate: assignment.changeDate,
        attendanceRows: assignment.classAttendance.length
    }));

    const history = await tx.enrollmentHistory.create({
        data: {
            studentId,
            enrollmentId: enrollment.id,
            subjectEnrollmentId: subjectEnrollment.id,
            termId: group.term.id,
            termName: group.term.name,
            termSubjectGroupId: group.id,
            groupName: group.subjectGroup.groupName,
            termSubjectId: subjectEnrollment.termSubjectId,
            subjectId: subjectEnrollment.termSubject.subject.id,
            subjectName,
            // The Enrollment row's own creation time. Never guessed for anything else.
            enrolledAt: enrollment.createdAt,
            endedByUserId: input.actor?.userId ?? null,
            endedByEmail: input.actor?.email ?? 'System',
            source,
            studentRoleAtEnd: enrollment.student.role,
            studentIsActiveAtEnd: enrollment.student.isActive,
            remainingInGroup,
            classAssignments,
            attendanceArchivedCount: attendanceRows.length
        },
        select: { id: true }
    });

    if (attendanceRows.length > 0) {
        await tx.classAttendanceArchive.createMany({
            data: attendanceRows.map(({ assignment, attendance }) => ({
                enrollmentHistoryId: history.id,
                studentId,
                classAttendanceId: attendance.id,
                studentClassAssignmentId: assignment.id,
                schoolCheckInAttendanceId: attendance.schoolCheckInAttendanceId,
                schoolDayId: attendance.schoolDayId,
                date: attendance.date,
                attendanceStatus: attendance.attendanceStatus,
                remarks: attendance.remarks,
                termId: assignment.termSubjectLevel.term.id,
                termName: assignment.termSubjectLevel.term.name,
                termSubjectLevelId: assignment.termSubjectLevelId,
                subjectId: assignment.termSubjectLevel.subject.id,
                subjectName: assignment.termSubjectLevel.subject.name,
                levelName: assignment.termSubjectLevel.level.name,
                sectionId: assignment.sectionId,
                sectionName: assignment.section.name,
                assignmentWasCurrent: assignment.isCurrentlyAssigned
            })),
            skipDuplicates: true
        });
        // Nothing may be deleted until every attendance row is provably archived.
        const archived = await tx.classAttendanceArchive.count({ where: { enrollmentHistoryId: history.id } });
        if (archived !== attendanceRows.length) {
            throw new Error(`Attendance archive incomplete for enrolment ${enrollment.id}: expected ${attendanceRows.length}, archived ${archived}. Nothing was de-enrolled.`);
        }
    }

    await tx.subjectEnrollment.delete({ where: { id: subjectEnrollment.id } });
    await tx.enrollment.delete({ where: { id: enrollment.id } });

    return { enrollmentHistoryId: history.id, enrollmentId: enrollment.id, subjectName, termSubjectGroupId: group.id, studentId, remainingInGroup, attendanceArchived: attendanceRows.length };
}

/**
 * True when the EnrollmentHistory table exists. Invoice generation reads it; if the code is ever deployed before the
 * migration, generation must keep working with the "no history" rules instead of failing every invoice run.
 * (A failed query inside a PostgreSQL transaction cannot be recovered from, so this is checked before the transaction.)
 */
export async function enrollmentHistoryTableExists(): Promise<boolean> {
    try {
        const rows = await db.$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('"EnrollmentHistory"') IS NOT NULL AS ok`;
        return rows[0]?.ok === true;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* Read-only views for the admin screens                               */
/* ------------------------------------------------------------------ */

/** Subjects the student has left, newest first. Never mixed with the current enrolments. */
export async function findStudentEnrollmentHistory(studentId: number, termId?: number) {
    return db.enrollmentHistory.findMany({
        where: { studentId, ...(termId ? { termId } : {}) },
        orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
        select: {
            id: true,
            termId: true,
            termName: true,
            termSubjectGroupId: true,
            groupName: true,
            subjectName: true,
            enrolledAt: true,
            endedAt: true,
            endedByEmail: true,
            source: true,
            remainingInGroup: true,
            attendanceArchivedCount: true,
            classAssignments: true
        }
    });
}

/** Class attendance that was kept when the student left a subject. */
export async function findArchivedClassAttendance(studentId: number, termId?: number) {
    return db.classAttendanceArchive.findMany({
        where: { studentId, ...(termId ? { termId } : {}) },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        select: {
            id: true,
            enrollmentHistoryId: true,
            date: true,
            attendanceStatus: true,
            remarks: true,
            termId: true,
            termName: true,
            subjectName: true,
            levelName: true,
            sectionName: true,
            enrollmentHistory: { select: { endedAt: true } }
        }
    });
}
