import { getIo } from '../../../../sockets/socket';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';

export async function createWeekdaySchoolCheckInAttendanceForStudent(date: string, termSubjectLevelId: string, sectionName: string) {
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
                const some = new Date();
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);

                let schoolDayRecord = await db.schoolDay.findFirst({
                    where: { schoolOperatedDate: startDate }
                });

                if (!schoolDayRecord) {
                    schoolDayRecord = await db.schoolDay.create({
                        data: {
                            schoolOperatedDate: startDate,
                            isOnWeekday: true,
                            isOnSunday: false

                            // other fields if necessary
                        }
                    });
                } else {
                    if (!schoolDayRecord.isOnWeekday) {
                        schoolDayRecord = await db.schoolDay.update({
                            where: { id: schoolDayRecord.id },
                            data: { isOnWeekday: true }
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
                        studentClassAssignment: {
                            some: {
                                termSubjectLevelId: parseInt(termSubjectLevelId),
                                section: {
                                    name: sectionName
                                }
                            }
                        },
                        enrollments: {
                            some: {
                                subjectEnrollment: {
                                    termSubject: {
                                        isOnWeekday: true
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
                                                    isOnWeekday: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                // if (existingRecords.length > 0) {
                //     throw customError('Attendance already created for today.', 'fail', 400, true);
                // }

                // Create SchoolCheckInAttendance records for all active students
                const attendanceRecords: any = [];
                for (const student of activeStudents) {
                    let existingAttendance = await db.schoolCheckInAttendance.findFirst({
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
                                attendanceValue: newAttendanceValue,
                                isOnLeave: isOnLeave
                            }
                        });

                        attendanceRecords.push(newAttendanceRecord);

                        // Find all current studentClassAssignments for the student
                        const studentClassAssignments = await db.studentClassAssignment.findMany({
                            // where: {
                            //     studentId: student.id,
                            //     isCurrentlyAssigned: true,
                            //     enrollment: {
                            //         subjectEnrollment: {
                            //             termSubject: {
                            //                 isOnWeekday: true
                            //             }
                            //         }
                            //     }
                            // },
                            where: {
                                studentId: student.id,
                                termSubjectLevelId: +termSubjectLevelId,
                                section: {
                                    name: sectionName
                                },
                                isCurrentlyAssigned: true
                            },
                            include: {
                                enrollment: {
                                    include: {
                                        subjectEnrollment: {
                                            where: {
                                                termSubject: {
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
                        // console.log(studentClassAssignments, 'studentClassAssignments ');
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
                                // console.log(newClasses, 'class attendance for keertana');
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
                        // Find all current studentClassAssignments for the student
                        const studentClassAssignments = await db.studentClassAssignment.findMany({
                            // where: {
                            //     studentId: student.id,
                            //     isCurrentlyAssigned: true,
                            //     enrollment: {
                            //         subjectEnrollment: {
                            //             termSubject: {
                            //                 isOnWeekday: true
                            //             }
                            //         }
                            //     }
                            // },
                            where: {
                                studentId: student.id,
                                isCurrentlyAssigned: true,
                                termSubjectLevel: {
                                    subject: {
                                        termSubject: {
                                            every: {
                                                isOnWeekday: true
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
                        // console.log(studentClassAssignments, 'studentClassAssignments ');
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
                                // console.log(newClasses, 'class attendance for keertana');
                            }
                        }
                    }
                }
                const io = getIo();
                io.emit('attendanceRecords-created-kirtan', {
                    attendanceRecords: attendanceRecords,
                    status: 'attendanceRecords-created-kirtan',
                    date: new Date()
                });
                return attendanceRecords;
            },
            { timeout: 30000 }
        );

        return transaction;
    } catch (error) {
        // Log the error or handle it as needed
        console.error('Error during creating School CheckIn Attendance:', error);

        // Throw a custom error to inform the user
        throw customError('Generating report cannot be completed. Please check your network and try again after one minute.', 'error', 500, true);
    }
}
