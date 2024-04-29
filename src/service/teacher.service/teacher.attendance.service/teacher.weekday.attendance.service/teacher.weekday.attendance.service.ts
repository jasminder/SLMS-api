import { getIo } from '../../../../sockets/socket';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';

export async function markWeekdayStudentAsPresent(studentId: string, studentClassAssignmentId: string, remarks?: string) {
    // Update the existing ClassAttendance record to mark the student as "PRESENT"

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // const openSkipReports = await db.skipReport.findFirst({
    //     where: {
    //         studentId: +studentId,
    //         date: {
    //             gte: startDate,
    //             lte: endDate
    //         },
    //         isClosed: false
    //     }
    // });

    // If there are open skip reports, throw an error
    // if (!openSkipReports?.isClosed) {
    //     throw customError(`Cannot mark student as PRESENT due to open skip report is not closed by ADMIN.`, 'fail', 400, true);
    // }
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            // checkedIn: false,
            // isMarked: false,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });
    if (!attendanceRecord) {
        throw customError('Attendance record not found for today.', 'fail', 404, true);
    }

    // Check if the student has already been checked in
    // if (attendanceRecord.checkedIn) {
    //     throw customError('Student is already checked in.', 'fail', 400, true);
    // }
    const updatedAttendanceRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkInTime: new Date(), // Set the check-in time to the current time
            checkedIn: true, // Mark the student as checked in
            remarks: remarks || null,
            isMarked: true,
            // isCheckedOut: true, // Mark the student as checked out
            // checkOutTime: (() => {
            //     const date = new Date();
            //     date.setHours(date.getHours() + 1); // Add one hour
            //     return date;
            // })()
            // attendanceValue: newAttendanceValue
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
    const io = getIo();
    io.emit('studentAttendanceUpdated', {
        studentId: studentId,
        status: 'ABSENT',
        date: new Date()
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
            checkedIn: true,

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

    return { updatedAttendanceRecord, updatedClassAttendanceRecords };
}
