import { db } from './db.server';

/**
 * Keeps attendance in step with a leave application.
 *
 * Attendance rows are created by the check-in services, which stamp LEAVE at creation
 * time if a leave already exists. When the leave is filed *after* attendance has been
 * generated for that day, nothing else corrects the already-written rows — that is what
 * this does.
 *
 * `startDate` / `endDate` are the leave's own stored boundaries (start-of-day and
 * end-of-day). Both `ClassAttendance.date` and `SchoolCheckInAttendance.date` are written
 * by the same server clock, so a range query over those boundaries covers every day of
 * the leave. The previous implementations matched on `date: currentDate` — an exact
 * equality against today's local midnight — which corrected only the day the leave
 * happened to be filed on and silently matched nothing when the API ran in a timezone
 * other than the one that wrote the rows.
 *
 * PRESENT is never overwritten. A student marked present actually attended; that is a
 * stronger fact than the leave, and the old code clobbered it in both directions.
 */
export async function syncLeaveAttendance(studentId: number, startDate: Date, endDate: Date, onLeave: boolean) {
    const dateRange = { gte: startDate, lte: endDate };

    const schoolAttendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: { studentId, date: dateRange },
        select: { id: true }
    });

    if (schoolAttendanceRecords.length > 0) {
        await db.schoolCheckInAttendance.updateMany({
            where: { id: { in: schoolAttendanceRecords.map((r) => r.id) } },
            data: { isOnLeave: onLeave }
        });

        // Imported lazily: admin.checkin.service pulls in this module's callers, so a
        // static import here would close a require cycle.
        const { updateStudentLastTwoDaysAttendance } = await import('../service/admin.service/admin.checkin.service/admin.checkin.service');
        await updateStudentLastTwoDaysAttendance(db, studentId);
    }

    // Only flip the status that the leave owns. ABSENT -> LEAVE when granted,
    // LEAVE -> ABSENT when revoked. PRESENT and every other status stay untouched.
    const classAttendanceResult = await db.classAttendance.updateMany({
        where: {
            studentClassAssignment: { studentId },
            date: dateRange,
            attendanceStatus: onLeave ? 'ABSENT' : 'LEAVE'
        },
        data: { attendanceStatus: onLeave ? 'LEAVE' : 'ABSENT' }
    });

    return {
        schoolCheckInUpdated: schoolAttendanceRecords.length,
        classAttendanceUpdated: classAttendanceResult.count
    };
}
