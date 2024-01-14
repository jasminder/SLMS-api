import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

export async function createSchoolCheckInAttendanceForStudent(date: string) {
    const providedDate = new Date(date);

    if (providedDate.getDay() !== 0) {
        throw customError('Attendance can only be created for Sundays.', 'fail', 400, true);
    }

    if (!date) {
        throw customError('You need to provide a date to create School CheckIn Attendance record.', 'fail', 404, true);
    }

    // Create a Prisma transaction
    const transaction = await db.$transaction(async (db) => {
        const currentTerm = await db.term.findFirst({
            where: {
                currentTerm: true
            }
        });

        // Find all active students in the current term
        const activeStudents = await db.student.findMany({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: currentTerm?.id
                    }
                }
            }
        });

        // Check if attendance records already exist for the specified date
        const existingRecords = await db.schoolCheckInAttendance.findMany({
            where: {
                date: new Date(date).toISOString().split('T')[0]
            }
        });

        if (existingRecords.length > 0) {
            throw customError('Attendance already created for today.', 'fail', 400, true);
        }

        // Create SchoolCheckInAttendance records for all active students
        const attendanceRecords = [];

        for (const student of activeStudents) {
            const newAttendanceRecord = await db.schoolCheckInAttendance.create({
                data: {
                    studentId: student.id,
                    date: new Date(date),
                    checkInTime: new Date()
                }
            });

            attendanceRecords.push(newAttendanceRecord);
        }

        // Create default ClassAttendance records using Prisma
        const currentDate = new Date(date).toISOString().split('T')[0];

        const studentClassAssignments = await db.studentClassAssignment.findMany({
            where: {
                isCurrentlyAssigned: true
            }
        });

        for (const studentClassAssignment of studentClassAssignments) {
            await db.classAttendance.create({
                data: {
                    studentClassAssignmentId: studentClassAssignment.id,
                    date: currentDate,
                    attendanceStatus: 'ABSENT'
                }
            });
        }

        return attendanceRecords;
    });

    return transaction;
}

/*mark check in true for a single studentid*/
export async function markSchoolCheckInAttendanceForStudent(studentId: string, remarks?: string) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format

    // Find the SchoolCheckInAttendance record for the specified student and date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: currentDate,
            checkedIn: false
        }
    });

    if (!attendanceRecord) {
        throw customError('Attendance record not found for today.', 'fail', 404, true);
    }

    // Check if the student has already been checked in
    if (attendanceRecord.checkedIn) {
        throw customError('Student is already checked in.', 'fail', 400, true);
    }

    // Update the check-in time and set checkedIn to true
    const updatedAttendanceRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkInTime: new Date(), // Set the check-in time to the current time
            checkedIn: true, // Mark the student as checked in
            remarks: remarks || null,
            isMarked: true
        }
    });

    return updatedAttendanceRecord;
}

/* NOT TO BE USED*/
/*mark check in false for all in bulk*/
// export async function markCheckInFalseForNonAttendees() {
//     // Find all SchoolCheckInAttendance records for the specified date where checkedIn is false
//     const currentDate = new Date().toISOString().split('T')[0];

//     const nonAttendees = await db.schoolCheckInAttendance.findMany({
//         where: {
//             date: currentDate,
//             checkedIn: false
//         }
//     });

//     // Update each non-attendee record to set checkedIn to false
//     const updatedRecords = await Promise.all(
//         nonAttendees.map(async (attendanceRecord) => {
//             return db.schoolCheckInAttendance.update({
//                 where: {
//                     id: attendanceRecord.id
//                 },
//                 data: {
//                     checkedIn: false,
//                     isMarked: true
//                 }
//             });
//         })
//     );

//     return updatedRecords;
// }

/*mark the check-in as false for single student ID*/
export async function markStudentAsNotCheckedIn(studentId: string) {
    const currentDate = new Date().toISOString().split('T')[0];
    // Find the SchoolCheckInAttendance record for the specified student
    const record = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            checkedIn: false,
            date: currentDate
        }
    });

    if (!record) {
        throw customError('Student has no checked-in record to mark as not checked in.', 'fail', 400, true);
    }

    // Update the found record to set checkedIn as false
    const updatedRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: record.id
        },
        data: {
            checkedIn: false,
            isMarked: true
        }
    });

    return updatedRecord;
}

/*mark the check-in as true for selected student IDs*/
export async function markCheckInTrueForSelectedStudents(studentIds: string[]) {
    // Find SchoolCheckInAttendance records for the specified student IDs, date, and where checkedIn is initially false
    const currentDate = new Date().toISOString().split('T')[0];
    const numericStudentIds = studentIds.map(Number);
    const checkInRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: {
                in: numericStudentIds
            },
            date: currentDate,
            checkedIn: false
        }
    });

    // Update the found records to set checkedIn as true and isMarked as true
    const updatedRecords = await Promise.all(
        checkInRecords.map(async (record) => {
            return db.schoolCheckInAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    checkedIn: true,
                    isMarked: true
                }
            });
        })
    );

    return updatedRecords;
}

/*mark the check-in as false for selected student IDs*/
export async function markCheckInFalseForSelectedStudents(studentIds: string[]) {
    const currentDate = new Date().toISOString().split('T')[0];
    const numericStudentIds = studentIds.map(Number);
    // Find SchoolCheckInAttendance records for the specified student IDs, date, and where checkedIn is initially true
    const checkInRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: {
                in: numericStudentIds
            },
            date: currentDate,
            checkedIn: false
        }
    });

    // Update the found records to set checkedIn as false
    const updatedRecords = await Promise.all(
        checkInRecords.map(async (record) => {
            return db.schoolCheckInAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    checkedIn: false,
                    isMarked: false
                }
            });
        })
    );

    return updatedRecords;
}
