import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

// Fetch all students who are checked in for the current day for checkingout at the end of school day
export async function fetchCheckedInStudentsForCheckout() {
    const currentDate = new Date().toISOString().split('T')[0]; // Get the date in "YYYY-MM-DD" format
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const checkedInStudents = await db.schoolCheckInAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            checkedIn: true,
            isMarked: true
        },
        orderBy: {
            student: {
                personalDetails: {
                    firstName: 'asc' // 'asc' for ascending order
                }
            }
        },
        include: {
            student: {
                include: {
                    studentClassAssignment: {
                        include: {
                            section: true,
                            termSubjectLevel: {
                                select: {
                                    level: {
                                        select: {
                                            name: true
                                        }
                                    },
                                    subject: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    personalDetails: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    schoolCheckInAttendance: {
                        orderBy: {
                            date: 'desc'
                        },
                        take: 3
                    },
                    skipReport: {
                        include: {
                            student: {
                                include: {
                                    personalDetails: true
                                }
                            }, // Include student details
                            teacher: {
                                include: {
                                    teacherPersonalDetails: true
                                }
                            },
                            admin: {
                                include: {
                                    adminPersonalDetails: true
                                }
                            }
                        }
                    }
                }
            },
            classAttendance: {
                select: {
                    attendanceStatus: true
                }
            }
        }
    });

    return checkedInStudents;
}

// Function to mark a student as checked out in SchoolCheckInAttendance records
export async function markStudentAsCheckedOut(studentId: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format

    // Find the SchoolCheckInAttendance record for the student and current date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            isMarked: true,
            checkedIn: true // Ensure that the student is checked in
        }
    });

    if (!attendanceRecord) {
        // If there's no record, it means the student is not checked in today
        throw customError(`Student ID ${studentId} is not checked in for today.`, 'fail', 400, true);
    }

    if (attendanceRecord.isCheckedOut) {
        // If the student is already checked out, you can handle this case accordingly, like skipping it or logging an error
        throw customError(`Student ID ${studentId} is already checked out for today.`, 'fail', 400, true);
    }

    // Update the SchoolCheckInAttendance record to mark the student as checked out
    await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            isCheckedOut: true, // Mark the student as checked out
            checkOutTime: new Date() // Set the check-out time to the current time
        }
    });
}

// Function to mark multiple students as checked out in SchoolCheckInAttendance records
export async function markSelectedStudentsAsCheckedOut(studentIds: string[]) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format
    const numericStudentIds = studentIds.map(Number);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Find the SchoolCheckInAttendance records for the specified student IDs and current date
    const attendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: {
                in: numericStudentIds
            },
            date: {
                gte: startDate,
                lte: endDate
            },
            checkedIn: true, // Ensure that the students are checked in
            isMarked: true
        }
    });
    const alreadyCheckedOut = attendanceRecords.filter((record) => !record.isCheckedOut);

    if (alreadyCheckedOut.length == 0) {
        throw new Error('All students are already checked out below.');
    }

    for (const attendanceRecord of attendanceRecords) {
        // Update each SchoolCheckInAttendance record to mark the student as checked out
        await db.schoolCheckInAttendance.update({
            where: {
                id: attendanceRecord.id
            },
            data: {
                isCheckedOut: true, // Mark the student as checked out
                checkOutTime: new Date() // Set the check-out time to the current time
            }
        });
    }

    return attendanceRecords;
}
