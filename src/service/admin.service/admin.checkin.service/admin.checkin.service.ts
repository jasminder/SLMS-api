import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { getIo } from '../../../sockets/socket';
import { Day, NotificationType } from '@prisma/client';
import { createManyNotificationsAndPush, createNotificationAndPush } from '../../notification.service/notification.service';

/** DB type: works with both global db and transaction client (Omit<PrismaClient, ...>) */
type DbClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Recomputes the "last 2 days" attendance value (0, 1, or 2) for a student
 * using the same logic as the cron: last 2 records with isOnLeave: false,
 * count how many have isMarked && checkedIn. Updates the most recent record's
 * attendanceValue and the Student's attendancePercentageValue.
 * Exported so other services (weekday checkin, checkout, leave, teacher attendance) can trigger recalculation.
 */
export async function updateStudentLastTwoDaysAttendance(db: DbClient, studentId: number): Promise<void> {
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

export async function createSchoolCheckInAttendanceForStudent(date: string) {
    if (!date) {
        throw customError('You need to provide a date to create School Check In Attendance record.', 'fail', 404, true);
    }
    try {
        const transaction = await db.$transaction(
            async (db) => {
                // Use the date we're creating attendance for (not "today") so past-date ingest uses correct timetable
                const dateForDay = new Date(date);
                const currentDay = dateForDay.toLocaleString('en-us', { weekday: 'long' }).toUpperCase() as unknown as Day;
                const currentTerm = await db.term.findFirst({
                    where: {
                        currentTerm: true
                    }
                });
                const activeTimetable = await db.timetable.findFirst({
                    where: {
                        day: currentDay,
                        isActive: true
                    }
                });
                if (!activeTimetable) {
                    throw customError(`No active timetable found for ${currentDay} (${date})`, 'fail', 404, true);
                }

                // Get all timetable slots for the active timetable
                const allTimetableSlots = await db.timetableSlot.findMany({
                    where: {
                        timetableId: activeTimetable.id
                    },
                    select: {
                        termSubjectLevelId: true,
                        sectionId: true
                    }
                });
                const timetableSlots = allTimetableSlots.filter((slot) => slot.termSubjectLevelId !== null && slot.sectionId !== null);
                if (timetableSlots.length === 0) {
                    throw customError(`No classes scheduled in timetable for ${currentDay} (${date})`, 'fail', 400, true);
                }
                const activeStudents = await db.student.findMany({
                    where: {
                        role: 'STUDENT',
                        isActive: true,
                        studentTermFee: {
                            some: {
                                termId: currentTerm?.id
                            }
                        },
                        studentClassAssignment: {
                            some: {
                                OR: timetableSlots.map((slot) => ({
                                    AND: [{ termSubjectLevelId: slot.termSubjectLevelId ?? undefined }, { sectionId: slot.sectionId ?? undefined }]
                                }))
                            }
                        }
                    },
                    include: {
                        studentClassAssignment: {
                            where: {
                                isCurrentlyAssigned: true
                            },
                            include: {
                                termSubjectLevel: true,
                                section: true
                            }
                        }
                    }
                });
                // console.log('activeStudents', JSON.stringify(activeStudents));
                // console.log('timetableSlots', JSON.stringify(timetableSlots));
                // console.log('timetable', JSON.stringify(activeTimetable));
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
                        }
                    });
                }

                if (activeStudents.length === 0) {
                    throw customError(`No students are enrolled for ${date}. Nothing to generate. Check isWeekDay/isSunday.`, 'fail', 400, true);
                }

                const attendanceRecords = await Promise.all(
                    activeStudents.map(async (student) => {
                        const existingAttendance = await db.schoolCheckInAttendance.findFirst({
                            where: {
                                studentId: student.id,
                                date: {
                                    gte: startDate,
                                    lte: endDate
                                }
                            }
                        });

                        const leaveRecord = await db.leave.findFirst({
                            where: {
                                studentId: student.id,
                                startDate: { lte: new Date(date) },
                                endDate: { gte: new Date(date) },
                                status: 'APPROVED'
                            }
                        });

                        let isOnLeave = leaveRecord ? true : false;
                        const attendanceStatus = leaveRecord ? 'LEAVE' : 'ABSENT';

                        if (!existingAttendance) {
                            // console.log('creating new school check in attendance');
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
                            // console.log('newAttendanceRecord', JSON.stringify(newAttendanceRecord));
                            // attendanceRecords.push(newAttendanceRecord);

                            // Find all current studentClassAssignments for the student
                            const studentClassAssignments = await db.studentClassAssignment.findMany({
                                where: {
                                    studentId: student.id,
                                    isCurrentlyAssigned: true,
                                    termSubjectLevel: {
                                        termId: currentTerm?.id
                                    },
                                    OR: timetableSlots.map((slot) => ({
                                        AND: [{ termSubjectLevelId: slot.termSubjectLevelId ?? undefined }, { sectionId: slot.sectionId ?? undefined }]
                                    }))
                                }
                            });
                            // console.log('studentClassAssignments', JSON.stringify(studentClassAssignments));
                            const processClassAssignments = studentClassAssignments.map(async (assignment) => {
                                const existingClassAttendance = await db.classAttendance.findUnique({
                                    where: {
                                        studentClassAssignmentId_date: {
                                            studentClassAssignmentId: assignment.id,
                                            date: startDate
                                        }
                                    }
                                });
                                // console.log('existingClassAttendance', JSON.stringify(existingClassAttendance));

                                if (!existingClassAttendance) {
                                    // console.log('creating new class attendance');
                                    return db.classAttendance.create({
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
                            });

                            const classAttendanceRecords = await Promise.all(processClassAssignments);
                            // console.log('classAttendanceRecords', JSON.stringify(classAttendanceRecords));

                            await updateStudentLastTwoDaysAttendance(db, student.id);
                        }
                    })
                );

                return attendanceRecords;
            },
            { timeout: 60000 }
        );

        return transaction;
    } catch (error: any) {
        console.log(error.message);
        if (error.message === 'Attendance-already-created-for-today') {
            throw customError('Attendance already created for today', 'fail', 400, true);
        } else if (error.message === 'No active timetable found for today') {
            throw customError('No active timetable found for today', 'fail', 400, true);
        } else if (error.message === 'No classes scheduled in timetable for today') {
            throw customError('No classes scheduled in timetable for today', 'fail', 400, true);
        } else {
            throw customError('Generating report cannot be completed. Please check your network and try again after one minute.', 'error', 500, true);
        }
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
                await updateStudentLastTwoDaysAttendance(db, record.studentId);
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

        await updateStudentLastTwoDaysAttendance(db, +studentId);

        const attendanceRecords = await db.schoolCheckInAttendance.findMany({
            where: { studentId: +studentId },
            orderBy: { date: 'desc' }
        });

        // if (attendanceRecords.length > 0) {
        //     const totalCheckedIn = attendanceRecords.filter((att) => att.checkedIn).length;
        //     const termAttendance = ((totalCheckedIn / attendanceRecords.length) * 100).toFixed(2); // Calculate percentage

        //     // Update student record with new values
        //     const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
        //         where: { studentId: +studentId },
        //         orderBy: { date: 'desc' },
        //         take: 2
        //     });
        //     let newAttendanceValue = 0;
        //     const countMarkedAndCheckedIn = recentAttendanceRecords.filter((record) => record.isMarked && record.checkedIn).length;

        //     if (countMarkedAndCheckedIn === 2) {
        //         newAttendanceValue = 2; // Both records have isMarked and checkedIn true
        //     } else if (countMarkedAndCheckedIn === 1) {
        //         newAttendanceValue = 1; // One of the records has isMarked and checkedIn true
        //     }

        //     await db.student.update({
        //         where: { id: +studentId },
        //         data: { termAttendance: parseFloat(termAttendance), attendancePercentageValue: newAttendanceValue }
        //     });
        // } else {
        //     await db.student.update({
        //         where: { id: +studentId },
        //         data: { termAttendance: 0, attendancePercentageValue: 0 }
        //     });
        // }

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
                            email: true,
                            contact: true
                        }
                    },
                    parentsDetails: {
                        select: {
                            parentContact: true
                        }
                    },
                    emergencyContact: {
                        select: {
                            contactNumber: true
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
    await updateStudentLastTwoDaysAttendance(db, +studentId);

    const io = getIo();
    io.emit('markSchoolCheckInAttendanceForStudent', {
        studentId: studentId,
        status: 'CheckedIn',
        date: new Date()
    });
    await createNotificationAndPush({
        studentId: +studentId,
        type: NotificationType.ATTENDANCE,
        content: 'Your school attendance has been marked as present.',
        actionUrl: `/student/dashboard?studentId=${studentId}`
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
        }
    });
    await updateStudentLastTwoDaysAttendance(db, +studentId);
    const io = getIo();
    io.emit('markSchoolCheckInAttendanceForStudent', {
        studentId: studentId,
        status: 'CheckedIn',
        date: new Date()
    });
    await createNotificationAndPush({
        studentId: +studentId,
        type: NotificationType.ATTENDANCE,
        content: 'Your school attendance has been updated to absent.',
        actionUrl: `/student/dashboard?studentId=${studentId}`
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

/* NOT TO BE USED Deprecated*/
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
    const updatedRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: record.id
        },
        data: {
            checkedIn: false,
            isMarked: true
        }
    });
    await updateStudentLastTwoDaysAttendance(db, +studentId);
    await createNotificationAndPush({
        studentId: +studentId,
        type: NotificationType.ATTENDANCE,
        content: 'Your school attendance has been marked as absent.',
        actionUrl: `/student/dashboard?studentId=${studentId}`
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

    const updatedRecords = await Promise.all(
        checkInRecords.map((record) =>
            db.schoolCheckInAttendance.update({
                where: { id: record.id },
                data: {
                    checkedIn: true,
                    checkInTime: new Date(),
                    isMarked: true
                }
            })
        )
    );
    const distinctStudentIds = [...new Set(checkInRecords.map((r) => r.studentId))];
    await Promise.all(distinctStudentIds.map((id) => updateStudentLastTwoDaysAttendance(db, id)));
    await createManyNotificationsAndPush(
        distinctStudentIds.map((id) => ({
            studentId: id,
            type: NotificationType.ATTENDANCE,
            content: 'Your school attendance has been marked as present.',
            actionUrl: `/student/dashboard?studentId=${id}`
        }))
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

    const updatedRecords = await Promise.all(
        checkInRecords.map((record) =>
            db.schoolCheckInAttendance.update({
                where: { id: record.id },
                data: {
                    checkedIn: false,
                    isMarked: true
                }
            })
        )
    );
    const distinctStudentIds = [...new Set(checkInRecords.map((r) => r.studentId))];
    await Promise.all(distinctStudentIds.map((id) => updateStudentLastTwoDaysAttendance(db, id)));
    await createManyNotificationsAndPush(
        distinctStudentIds.map((id) => ({
            studentId: id,
            type: NotificationType.ATTENDANCE,
            content: 'Your school attendance has been marked as absent.',
            actionUrl: `/student/dashboard?studentId=${id}`
        }))
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

export async function toggleAutomatedAttendance(termId: string, enabled: boolean) {
    try {
        // Validate term exists
        const term = await db.term.findUnique({
            where: { id: Number(termId) }
        });

        if (!term) {
            throw customError('Term not found', 'fail', 404, true);
        }

        // Update the term's automated attendance setting
        const updatedTerm = await db.term.update({
            where: { id: Number(termId) },
            data: {
                automatedAttendanceEnabled: enabled
            }
        });

        return {
            status: 'success',
            message: `Automated attendance ${enabled ? 'enabled' : 'disabled'} for term ${term.name}`,
            data: updatedTerm
        };
    } catch (error: any) {
        console.error('Error toggling automated attendance:', error);
        throw customError(error.message || 'Failed to update automated attendance setting', 'error', error.statusCode || 500, true);
    }
}
