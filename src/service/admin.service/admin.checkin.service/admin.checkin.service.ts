import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { getIo } from '../../../sockets/socket';

export async function createSchoolCheckInAttendanceForStudent(date: string) {
    if (!date) {
        throw customError('You need to provide a date to create School CheckIn Attendance record.', 'fail', 404, true);
    }
    try {
        const transaction = await db.$transaction(
            async (db) => {
                const currentTerm = await db.term.findFirst({
                    where: {
                        currentTerm: true
                    }
                });
                const startDate = new Date(date);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);

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
                } else {
                    // If the record exists but isOnSunday is not set
                    if (!schoolDayRecord.isOnSunday) {
                        schoolDayRecord = await db.schoolDay.update({
                            where: { id: schoolDayRecord.id },
                            data: { isOnSunday: true }
                        });
                    }
                }

                // Find all active students in the current term
                const activeStudents = await db.student.findMany({
                    where: {
                        role: 'STUDENT',
                        isActive: true,
                        studentTermFee: {
                            some: {
                                termId: currentTerm?.id
                            }
                        },
                        enrollments: {
                            some: {
                                subjectEnrollment: {
                                    termSubject: {
                                        isOnSunday: true
                                    }
                                }
                            }
                        }
                    },
                    include: {
                        studentClassAssignment: true,
                        personalDetails: true,
                        enrollments: {
                            include: {
                                subjectEnrollment: {
                                    include: {
                                        termSubject: true
                                    }
                                }
                            }
                        }
                    }
                });
                if (activeStudents.length == 0) {
                    throw customError('No students are enrolled for today. Nothing to generate. Check isWeekDay/isSunday.', 'fail', 400, true);
                }
                const existingRecords = await db.schoolCheckInAttendance.findMany({
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        },
                        classAttendance: {
                            every: {
                                studentClassAssignment: {
                                    termSubjectLevel: {
                                        subject: {
                                            termSubject: {
                                                every: {
                                                    isOnSunday: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (existingRecords.length > 0) {
                    throw customError('Attendance already created for today.', 'fail', 400, true);
                }

                // Create SchoolCheckInAttendance records for all active students
                const attendanceRecords: any = [];

                for (const student of activeStudents) {
                    const existingAttendance = await db.schoolCheckInAttendance.findFirst({
                        where: {
                            studentId: student.id,
                            date: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    });

                    if (!existingAttendance) {
                        const leaveRecord = await db.leave.findFirst({
                            where: {
                                studentId: student.id,
                                startDate: { lte: new Date(date) },
                                endDate: { gte: new Date(date) },
                                status: 'APPROVED'
                            }
                        });
                        let isOnLeave = false;
                        if (leaveRecord) {
                            isOnLeave = true;
                        }
                        const attendanceStatus = leaveRecord ? 'LEAVE' : 'ABSENT';
                        const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                            where: { studentId: student.id, isOnLeave: false },
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
                                attendanceValue: newAttendanceValue,
                                isOnLeave: isOnLeave
                            }
                        });

                        attendanceRecords.push(newAttendanceRecord);

                        // Find all current studentClassAssignments for the student
                        const studentClassAssignments = await db.studentClassAssignment.findMany({
                            where: {
                                studentId: student.id,
                                isCurrentlyAssigned: true,
                                termSubjectLevel: {
                                    subject: {
                                        termSubject: {
                                            every: {
                                                isOnSunday: true
                                            }
                                        }
                                    }
                                }
                            },
                            include: {
                                enrollment: {
                                    include: {
                                        subjectEnrollment: {
                                            where: {
                                                termSubject: {
                                                    isOnSunday: true,
                                                    isOnWeekday: true
                                                }
                                            },
                                            include: {
                                                termSubject: true
                                            }
                                        }
                                    }
                                }
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
                            if (!existingClassAttendance) {
                                const newClasses = await db.classAttendance.create({
                                    data: {
                                        studentClassAssignmentId: assignment.id,
                                        date: startDate,
                                        schoolCheckInAttendanceId: newAttendanceRecord.id,
                                        attendanceStatus: attendanceStatus,
                                        schoolDayId: schoolDayRecord?.id
                                        // other fields if necessary
                                    }
                                });
                            }
                        }
                    } else {
                        const leaveRecord = await db.leave.findFirst({
                            where: {
                                studentId: student.id,
                                startDate: { lte: new Date(date) },
                                endDate: { gte: new Date(date) },
                                status: 'APPROVED'
                            }
                        });
                        let isOnLeave = false;
                        if (leaveRecord) {
                            isOnLeave = true;
                        }
                        const attendanceStatus = leaveRecord ? 'LEAVE' : 'ABSENT';
                        const studentClassAssignments = await db.studentClassAssignment.findMany({
                            where: {
                                studentId: student.id,
                                isCurrentlyAssigned: true,
                                termSubjectLevel: {
                                    subject: {
                                        termSubject: {
                                            every: {
                                                isOnSunday: true
                                            }
                                        }
                                    }
                                }
                            },
                            include: {
                                enrollment: {
                                    include: {
                                        subjectEnrollment: {
                                            where: {
                                                termSubject: {
                                                    isOnSunday: true
                                                }
                                            },
                                            include: {
                                                termSubject: true
                                            }
                                        }
                                    }
                                }
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
                            if (!existingClassAttendance) {
                                const newClasses = await db.classAttendance.create({
                                    data: {
                                        studentClassAssignmentId: assignment.id,
                                        date: startDate,
                                        schoolCheckInAttendanceId: existingAttendance.id,
                                        attendanceStatus: attendanceStatus,
                                        schoolDayId: schoolDayRecord?.id
                                        // other fields if necessary
                                    }
                                });
                            }
                        }
                    }
                }

                return attendanceRecords;
            },
            { timeout: 60000 }
        );

        return transaction;
    } catch (error) {
        console.error('Error during creating School CheckIn Attendance:', error);
        throw customError('Generating report cannot be completed. Please check your network and try again after one minute.', 'error', 500, true);
    }
}
export async function undoSchoolCheckInAttendanceForStudent(date: string) {
    if (!date) {
        throw customError('You need to provide a date to undo School CheckIn Attendance records.', 'fail', 400, true);
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const transaction = await db.$transaction(
        async (db) => {
            const attendanceRecords = await db.schoolCheckInAttendance.findMany({
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: {
                    classAttendance: true // Include related class attendance records
                }
            });
            const schoolDayId = attendanceRecords[0].schoolDayId;
            for (const record of attendanceRecords) {
                if (record.classAttendance && record.classAttendance.length > 0) {
                    await db.classAttendance.deleteMany({
                        where: { id: { in: record.classAttendance.map((ca) => ca.id) } }
                    });
                }

                await db.schoolCheckInAttendance.delete({
                    where: { id: record.id }
                });
            }
            for (const record of attendanceRecords) {
                const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                    where: {
                        studentId: record.studentId,
                        date: { lt: startDate }
                    },
                    orderBy: { date: 'desc' },
                    take: 2
                });

                let newAttendanceValue = 0;
                const countMarkedAndCheckedIn = recentAttendanceRecords.filter((rec) => rec.isMarked && rec.checkedIn).length;

                if (countMarkedAndCheckedIn === 2) {
                    newAttendanceValue = 2;
                } else if (countMarkedAndCheckedIn === 1) {
                    newAttendanceValue = 1;
                }

                if (recentAttendanceRecords.length > 0) {
                    await db.schoolCheckInAttendance.update({
                        where: { id: recentAttendanceRecords[0].id },
                        data: { attendanceValue: newAttendanceValue }
                    });
                }
            }
            const mailsToDelete = await db.automatedMailForParents.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            if (mailsToDelete.length > 0) {
                await db.automatedMailForParents.deleteMany({
                    where: {
                        id: { in: mailsToDelete.map((mail) => mail.id) }
                    }
                });
            }

            // Delete the SchoolDay record if it exists
            if (schoolDayId) {
                await db.schoolDay.delete({
                    where: { id: schoolDayId }
                });
            }
            console.log(`Deleted ${mailsToDelete.length} automated mails created today.`);
            return { message: 'Undo operation completed successfully.' };
        },
        { timeout: 30000 }
    );

    return transaction;
}

export async function undoSchoolCheckInAttendanceForStudentById(studentId: string, date: string) {
    // Input validation
    if (!studentId || !date) {
        throw customError('Student ID and date must be provided.', 'fail', 404, true);
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Start a transaction
    const transaction = await db.$transaction(async (db) => {
        //0 find the schoolcheckinattendance
        const schoolCheckinAttendance = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: +studentId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                classAttendance: true // Include related class attendance records
            }
        });
        if (!schoolCheckinAttendance) {
            throw customError('No check-in attendance record found for the given student and date.', 'fail', 404, true);
        }

        if (schoolCheckinAttendance && schoolCheckinAttendance.classAttendance && schoolCheckinAttendance?.classAttendance.length > 0) {
            await db.classAttendance.deleteMany({
                where: { id: { in: schoolCheckinAttendance.classAttendance.map((ca) => ca.id) } }
            });
            await db.schoolCheckInAttendance.delete({
                where: { id: schoolCheckinAttendance.id }
            });
        } else {
            await db.schoolCheckInAttendance.delete({
                where: { id: schoolCheckinAttendance.id }
            });
        }

        const attendanceRecords = await db.schoolCheckInAttendance.findMany({
            where: { studentId: +studentId },
            orderBy: { date: 'desc' }
        });

        if (attendanceRecords.length > 0) {
            const totalCheckedIn = attendanceRecords.filter((att) => att.checkedIn).length;
            const termAttendance = ((totalCheckedIn / attendanceRecords.length) * 100).toFixed(2); // Calculate percentage

            // Update student record with new values
            const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                where: { studentId: +studentId },
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

            await db.student.update({
                where: { id: +studentId },
                data: { termAttendance: parseFloat(termAttendance), attendancePercentageValue: newAttendanceValue }
            });
        } else {
            await db.student.update({
                where: { id: +studentId },
                data: { termAttendance: 0, attendancePercentageValue: 0 }
            });
        }

        // 3. Recalculate new attendance value for other students
        const remainingAttendances = await db.schoolCheckInAttendance.count({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // If no remaining attendances, delete the SchoolDay record
        let deletedSchoolDay = null;
        if (remainingAttendances === 0 && schoolCheckinAttendance.schoolDayId) {
            // Fetch the SchoolDay id first

            deletedSchoolDay = await db.schoolDay.delete({
                where: {
                    id: schoolCheckinAttendance.schoolDayId // Use the fetched id to delete
                }
            });
        }
    });

    return transaction;
}

//-----------------------------------//
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
            // classAttendance: {
            //     every: {
            //         studentClassAssignment: {
            //             termSubjectLevel: {
            //                 subject: {
            //                     termSubject: {
            //                         every: {
            //                             isOnSunday: true,
            //                             isOnWeekday: true
            //                         }
            //                     }
            //                 }
            //             }
            //         }
            //     }
            // }
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
                                            name: true,
                                            termSubject: {
                                                select: {
                                                    isOnSunday: true
                                                    // isOnWeekday: true
                                                }
                                            }
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
    // let newAttendanceValue;
    // if (attendanceRecord.checkedIn) {
    //     // If already checked in, do not change the attendance value
    //     newAttendanceValue = attendanceRecord.attendanceValue;
    // } else {
    //     // If not checked in, calculate new value based on current attendanceValue
    //     newAttendanceValue = attendanceRecord.attendanceValue === 0 ? 1 : 2;
    // }
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
            // attendanceValue: newAttendanceValue
        }
    });
    const io = getIo();
    io.emit('markSchoolCheckInAttendanceForStudent', {
        studentId: studentId,
        status: 'CheckedIn',
        date: new Date()
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
