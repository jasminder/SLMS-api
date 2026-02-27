/**
 * Recalculates "2 Days Att" (attendancePercentageValue) for all active students
 * based on their last 2 school check-in attendance records (excluding leave).
 * Use this to fix the student list after a bug or to backfill existing data.
 *
 * Usage (from SLMS-apis directory):
 *   npx ts-node prisma/recalc-last-2-days-attendance.ts
 *   npm run recalc-last-2-days-attendance
 */

import { db } from '../src/utils/db.server';

async function updateStudentLastTwoDaysAttendance(studentId: number): Promise<void> {
    const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: { studentId, isOnLeave: false },
        orderBy: { date: 'desc' },
        take: 2
    });
    let newAttendanceValue = 0;
    const countMarkedAndCheckedIn = recentAttendanceRecords.filter((r) => r.isMarked && r.checkedIn).length;
    if (countMarkedAndCheckedIn === 2) newAttendanceValue = 2;
    else if (countMarkedAndCheckedIn === 1) newAttendanceValue = 1;

    if (recentAttendanceRecords.length > 0) {
        await db.schoolCheckInAttendance.update({
            where: { id: recentAttendanceRecords[0].id },
            data: { attendanceValue: newAttendanceValue }
        });
    }
    await db.student.update({
        where: { id: studentId },
        data: { attendancePercentageValue: newAttendanceValue }
    });
}

async function main() {
    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true }
    });
    if (!currentTerm) {
        console.error('No current term found.');
        process.exit(1);
    }

    const students = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentClassAssignment: {
                some: {
                    isCurrentlyAssigned: true,
                    termSubjectLevel: { termId: currentTerm.id }
                }
            }
        },
        select: { id: true, akaalId: true }
    });

    console.log(`Recalculating "2 Days Att" for ${students.length} active student(s)...`);
    for (const s of students) {
        await updateStudentLastTwoDaysAttendance(s.id);
        console.log(`  std-Id ${s.akaalId} (id ${s.id}) -> updated`);
    }
    console.log('Done. Refresh the Active Students list to see correct "2 Days Att" values.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
