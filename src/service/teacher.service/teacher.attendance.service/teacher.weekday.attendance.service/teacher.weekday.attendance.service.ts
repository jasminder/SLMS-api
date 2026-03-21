import { getIo } from '../../../../sockets/socket';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';
import { updateStudentLastTwoDaysAttendance } from '../../../../service/admin.service/admin.checkin.service/admin.checkin.service';
import { NotificationType } from '@prisma/client';
import { createNotificationAndPush } from '../../../notification.service/notification.service';

export async function markWeekdayStudentAsPresent(studentId: string, studentClassAssignmentId: string, remarks?: string) {
    // Update the existing ClassAttendance record to mark the student as "PRESENT"

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });
    if (!attendanceRecord) {
        throw customError('Attendance record not found for today.', 'fail', 404, true);
    }
    const today = new Date();
    const isSunday = today.getDay() === 0;
    const updatedAttendanceRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkInTime: new Date(), // Set the check-in time to the current time
            checkedIn: true, // Mark the student as checked in
            remarks: remarks || null,
            isMarked: true,
            isCheckedOut: isSunday ? null : true, // Conditional assignment based on whether today is Sunday
            checkOutTime: isSunday
                ? null
                : (() => {
                      const date = new Date();
                      date.setHours(date.getHours() + 1); // Add one hour
                      return date;
                  })() // Assign check out time conditionally
        }
    });

    const updatedClassAttendanceRecord = await db.classAttendance.updateMany({
        where: {
            studentClassAssignmentId: +studentClassAssignmentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            attendanceStatus: 'ABSENT',
            studentClassAssignment: {
                studentId: +studentId
            }
        },
        data: {
            attendanceStatus: 'PRESENT'
        }
    });
    if (!updatedClassAttendanceRecord) {
        throw customError(`Failed to mark student as PRESENT.`, 'fail', 400, true);
    }
    await updateStudentLastTwoDaysAttendance(db, +studentId);
    const io = getIo();
    io.emit('studentAttendanceUpdated', {
        studentId: studentId,
        status: 'ABSENT',
        date: new Date()
    });
    await createNotificationAndPush({
        studentId: +studentId,
        type: NotificationType.ATTENDANCE,
        content: 'Your attendance has been marked as present.',
        actionUrl: `/student/dashboard?studentId=${studentId}`
    });
    return { updatedClassAttendanceRecord, updatedAttendanceRecord };
}
export async function undoMarkWeekdayStudentAsPresent(studentId: string, studentClassAssignmentId: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            isMarked: true,
            checkedIn: true
        }
    });

    if (!attendanceRecord) {
        throw customError('No marked attendance record found for today.', 'fail', 404, true);
    }

    const updatedAttendanceRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkedIn: false,
            checkInTime: null,
            isCheckedOut: false,
            checkOutTime: null,
            isMarked: false
        }
    });
    await updateStudentLastTwoDaysAttendance(db, +studentId);

    const updatedClassAttendanceRecords = await db.classAttendance.updateMany({
        where: {
            studentClassAssignmentId: +studentClassAssignmentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            studentClassAssignment: {
                studentId: +studentId
            },
            attendanceStatus: 'PRESENT'
        },
        data: {
            attendanceStatus: 'ABSENT'
        }
    });

    if (!updatedClassAttendanceRecords) {
        throw customError(`Failed to revert attendance status for student.`, 'fail', 400, true);
    }
    const io = getIo();
    io.emit('studentAttendanceUpdated', {
        studentId: studentId,
        status: 'ABSENT',
        date: new Date()
    });
    await createNotificationAndPush({
        studentId: +studentId,
        type: NotificationType.ATTENDANCE,
        content: 'Your attendance has been updated to absent.',
        actionUrl: `/student/dashboard?studentId=${studentId}`
    });

    return { updatedAttendanceRecord, updatedClassAttendanceRecords };
}
