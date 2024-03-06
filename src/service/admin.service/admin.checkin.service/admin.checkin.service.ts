import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

export async function createSchoolCheckInAttendanceForStudent(date: string) {
    if (!date) {
        throw customError('You need to provide a date to create School CheckIn Attendance record.', 'fail', 404, true);
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const some = new Date();
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    console.log(startDate, 'startDate');
    console.log(endDate, 'endDate');
    console.log(date, 'from client side date');
    console.log(some, 'date created from new Date()');
    let schoolDayRecord = await db.schoolDay.findFirst({
        where: { schoolOperatedDate: startDate }
    });

    if (!schoolDayRecord) {
        schoolDayRecord = await db.schoolDay.create({
            data: {
                schoolOperatedDate: startDate

                // other fields if necessary
            }
        });
    }
    // Create a Prisma transaction
    const transaction = await db.$transaction(
        async (db) => {
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
                },
                include: {
                    studentClassAssignment: true,
                    personalDetails: true
                }
            });

            const studentsWithoutAssignment = activeStudents.filter((student) => !student.studentClassAssignment || student.studentClassAssignment.length === 0);
            console.log(studentsWithoutAssignment);

            const allActiveStudents = await db.student.findMany({
                where: {
                    isActive: true // Filters to only include active students
                },
                include: {
                    // Include any related data you might need, like personal details
                    personalDetails: true,
                    parentsDetails: true
                    // Add any other relations you need here
                }
                // Optionally, you can also add ordering or pagination here
                // orderBy: {
                //     createdAt: 'desc'
                // }
            });
            if (allActiveStudents.length == 0) {
                throw customError(`There are no  active students. Please enroll students in a current term to do this action`, 'fail', 400, true);
            }
            // if (studentsWithoutAssignment.length > 0) {
            //     const studentsWithoutClass = studentsWithoutAssignment.map((student) => student.personalDetails?.firstName);
            //     throw customError(`Some active students ${studentsWithoutClass.join(',')}  are not assigned to any class. Please assign students to classes.`, 'fail', 400, true);
            // }
            // Check if attendance records already exist for the specified date
            const existingRecords = await db.schoolCheckInAttendance.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            if (existingRecords.length > 0) {
                throw customError('Attendance already created for today.', 'fail', 400, true);
            }

            // Create SchoolCheckInAttendance records for all active students
            const attendanceRecords: any = [];
            for (const student of activeStudents) {
                const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                    where: { studentId: student.id },
                    orderBy: { date: 'desc' },
                    take: 2
                });
                let newAttendanceValue = 0;
                const countMarkedAndCheckedIn = recentAttendanceRecords.filter((record) => record.isMarked && record.checkedIn).length;

                if (countMarkedAndCheckedIn === 2) {
                    newAttendanceValue = 2; // Both records have isMarked and checkedIn true
                } else if (countMarkedAndCheckedIn === 1) {
                    newAttendanceValue = 1; // One of the records has isMarked and checkedIn true
                }

                const newAttendanceRecord = await db.schoolCheckInAttendance.create({
                    data: {
                        studentId: student.id,
                        date: new Date(date),
                        schoolDayId: schoolDayRecord?.id,
                        attendanceValue: newAttendanceValue
                    }
                });
                if (
                    student.id == 5218 ||
                    student.id == 5120 ||
                    student.id == 5234 ||
                    student.id == 5186 ||
                    student.id == 5135 ||
                    student.id == 5063 ||
                    student.id == 5261 ||
                    student.id == 5217 ||
                    student.id == 5259 ||
                    student.id == 5033 ||
                    student.id == 5173 ||
                    student.id == 5271 ||
                    student.id == 5300 ||
                    student.id == 5299
                ) {
                    console.log(student.id, 'studentID');
                    console.log(newAttendanceValue, 'newAttendanceValue');
                    console.log(recentAttendanceRecords, 'recentAttendanceRecords');
                }
                attendanceRecords.push(newAttendanceRecord);

                // Find all current studentClassAssignments for the student
                const studentClassAssignments = await db.studentClassAssignment.findMany({
                    where: {
                        studentId: student.id,
                        isCurrentlyAssigned: true
                    }
                });

                for (const assignment of studentClassAssignments) {
                    // Check if a ClassAttendance record already exists for the assignment and date
                    const existingClassAttendance = await db.classAttendance.findUnique({
                        where: {
                            studentClassAssignmentId_date: {
                                studentClassAssignmentId: assignment.id,
                                date: startDate
                            }
                        }
                    });

                    // If a record exists, update it, otherwise create a new one
                    if (existingClassAttendance) {
                        await db.classAttendance.update({
                            where: {
                                id: existingClassAttendance.id
                            },
                            data: {
                                schoolCheckInAttendanceId: newAttendanceRecord.id
                                // update other fields if necessary
                            }
                        });
                    } else {
                        const newClasses = await db.classAttendance.create({
                            data: {
                                studentClassAssignmentId: assignment.id,
                                date: startDate,
                                schoolCheckInAttendanceId: newAttendanceRecord.id,
                                attendanceStatus: 'ABSENT',
                                schoolDayId: schoolDayRecord?.id
                                // other fields if necessary
                            }
                        });
                    }
                }
            }
            return attendanceRecords;
        },
        { timeout: 30000 }
    );

    return transaction;
}

/*fetch all freshly created schoolCheckInAttendance */
export async function fetchSchoolCheckInAttendance() {
    // Calculate today's date as a string in ISO format (YYYY-MM-DD)
    const currentDate = new Date().toISOString().split('T')[0];

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const records = await db.schoolCheckInAttendance.findMany({
        where: {
            // isMarked: false,
            // checkedIn: false,
            date: {
                gte: startDate,
                lte: endDate
            }
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
                            termSubjectLevel: true
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

    return records;
}

/*mark check in true for a single studentid*/
export async function markSchoolCheckInAttendanceForStudent(studentId: string, remarks?: string) {
    // const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Find the SchoolCheckInAttendance record for the specified student and date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            checkedIn: false,
            isMarked: false,
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
    if (attendanceRecord.checkedIn) {
        throw customError('Student is already checked in.', 'fail', 400, true);
    }
    let newAttendanceValue;
    if (attendanceRecord.checkedIn) {
        // If already checked in, do not change the attendance value
        newAttendanceValue = attendanceRecord.attendanceValue;
    } else {
        // If not checked in, calculate new value based on current attendanceValue
        newAttendanceValue = attendanceRecord.attendanceValue === 0 ? 1 : 2;
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
            isMarked: true,
            attendanceValue: newAttendanceValue
        }
    });

    return updatedAttendanceRecord;
}

/*undo checkin for a student*/
export async function undoCheckIn(studentId: string) {
    // const currentDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const record = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            checkedIn: true,
            isMarked: true,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    if (!record) {
        throw customError('No check-in record found for the student to undo.', 'fail', 404, true);
    }

    const updatedRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: record.id
        },
        data: {
            checkedIn: false,
            checkInTime: null,
            isMarked: false
            // Reset the check-in time
            // Update other fields if necessary
        }
    });

    return updatedRecord;
}

// search student for the admin to check in
export async function searchSchoolCheckInAttendance(search = '', page: number, subjectOption = '') {
    const take = 10;
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Use Prisma to fetch SchoolCheckInAttendance records with pagination and search criteria
    const todaySchoolCheckInAttendance = await db.schoolCheckInAttendance.findMany({
        skip,
        take,
        orderBy: {
            date: 'desc'
        },
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            isMarked: false,
            checkedIn: false,
            OR: [
                {
                    student: {
                        OR: [
                            {
                                personalDetails: {
                                    OR: [
                                        { firstName: { contains: search, mode: 'insensitive' } },
                                        { lastName: { contains: search, mode: 'insensitive' } },
                                        { email: { contains: search, mode: 'insensitive' } },
                                        { contact: { contains: search, mode: 'insensitive' } },
                                        { postcode: { contains: search, mode: 'insensitive' } }
                                    ]
                                }
                            },
                            {
                                parentsDetails: {
                                    OR: [
                                        { fatherName: { contains: search, mode: 'insensitive' } },
                                        { motherName: { contains: search, mode: 'insensitive' } },
                                        { parentEmail: { contains: search, mode: 'insensitive' } },
                                        { parentContact: { contains: search, mode: 'insensitive' } }
                                    ]
                                }
                            },
                            {
                                studentClassAssignment: {
                                    some: {
                                        OR: [
                                            // Add your criteria for StudentClassAssignment search here
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    });

    return { todaySchoolCheckInAttendance };
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
            isMarked: false
        }
    });

    if (!record) {
        throw customError('Student has no checked-in record to mark as not checked in.', 'fail', 400, true);
    }
    let newAttendanceValue;
    if (record.checkedIn) {
        // If already checked in, do not change the attendance value
        newAttendanceValue = record.attendanceValue;
    } else {
        // If not checked in, calculate new value based on current attendanceValue
        newAttendanceValue = record.attendanceValue === 2 ? 1 : 0;
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
            checkedIn: false,
            isMarked: false
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
                    checkInTime: new Date(),
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
            isMarked: false,
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
                    isMarked: true
                }
            });
        })
    );

    return updatedRecords;
}

/*undo false check in*/
export async function undoFalseCheckin(studentId: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Find the SchoolCheckInAttendance record for the specified student
    const record = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            checkedIn: false,
            isMarked: true,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    if (!record) {
        throw customError('No record found to undo false check-in.', 'fail', 400, true);
    }

    // Update the found record to set checkedIn as true and isMarked as false
    const updatedRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: record.id
        },
        data: {
            checkedIn: false,
            isMarked: false
        }
    });

    return updatedRecord;
}
