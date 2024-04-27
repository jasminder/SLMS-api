import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';
import { setSendDate } from '../../../utils/setSendDate';

/* fetching the check-in record for students who have checked in with default class-attendance */

export async function fetchCheckedInStudentsWithAttendance(termSubjectLevelId: string, sectionName: string) {
    const numericTermSubjectLevelId = parseInt(termSubjectLevelId);

    // Find students who are currently assigned to the specified class and are active
    const classAssignments = await db.studentClassAssignment.findMany({
        where: {
            termSubjectLevelId: numericTermSubjectLevelId,
            section: {
                name: sectionName
            },
            isCurrentlyAssigned: true,
            student: {
                role: 'STUDENT'
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
                            termSubjectLevel: {
                                include: {
                                    subject: {
                                        include: {
                                            termSubject: {
                                                select: {
                                                    isOnSunday: true,
                                                    isOnWeekday: true
                                                }
                                            }
                                        }
                                    },
                                    level: true
                                }
                            }
                        }
                    },
                    personalDetails: true
                }
            } // Include the student details
        } //
    });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Fetch SchoolCheckInAttendance for each student in the same class
    const studentsWithCheckInAndAttendance = await Promise.all(
        classAssignments.map(async (assignment) => {
            const checkInData = await db.schoolCheckInAttendance.findFirst({
                where: {
                    studentId: assignment.student.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                    // checkedIn: true,
                    // isMarked: true
                }
            });

            // Find the corresponding ClassAttendance record using schoolCheckInAttendanceId and studentClassAssignmentId
            const classAttendanceData = await db.classAttendance.findFirst({
                where: {
                    schoolCheckInAttendanceId: checkInData?.id,
                    studentClassAssignmentId: assignment.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            return {
                student: assignment.student,
                checkInData: checkInData,
                classAttendance: classAttendanceData || null
            };
        })
    );

    // Filter out null entries (students who weren't checked in)
    const filteredStudents = studentsWithCheckInAndAttendance.filter((student) => student !== null);

    // console.log(filteredStudents);

    return filteredStudents;
}
export async function fetchSchooldayType(termSubjectLevelId: string) {
    const schooldayType = await db.termSubjectLevel.findUnique({
        where: { id: +termSubjectLevelId },
        select: {
            subject: {
                select: {
                    termSubject: {
                        select: {
                            isOnSunday: true,
                            isOnWeekday: true
                        }
                    }
                }
            }
        }
    });
    return schooldayType;
}
export async function markStudentAsPresent(studentId: string, studentClassAssignmentId: string) {
    // Update the existing ClassAttendance record to mark the student as "PRESENT"

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const openSkipReports = await db.skipReport.findFirst({
        where: {
            studentId: +studentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            isClosed: false
        }
    });

    // If there are open skip reports, throw an error
    // if (!openSkipReports?.isClosed) {
    //     throw customError(`Cannot mark student as PRESENT due to open skip report is not closed by ADMIN.`, 'fail', 400, true);
    // }
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

    return updatedClassAttendanceRecord;
}

/* create student skip report*/
export async function createSkipReport(studentId: string, teacherId: string, reason: string, className: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (!reason) {
        throw customError('Reason is required to create a skip report.', 'fail', 400, true);
    }

    const skipReport = await db.skipReport.create({
        data: {
            studentId: +studentId,
            teacherId: +teacherId,
            date: new Date(),
            reason,
            className
        }
    });
    return skipReport;
}
/*fetch last 5 attendance for the students*/
export async function getLastFiveClassAttendances(studentId: string, studentClassAssignmentId: string) {
    const attendances = await db.classAttendance.findMany({
        where: {
            studentClassAssignment: {
                id: +studentClassAssignmentId,
                studentId: +studentId
            }
        },
        orderBy: {
            date: 'desc'
        },
        take: 5
    });

    return attendances;
}
/*create automated emails record for all students in the class*/
export async function createAutomatedMailForParents(studentIds: string[], teacherId: string, termSubjectLevelId: string, sectionId: string, className: string, roomName: string, classTime: string) {
    const sendDate = setSendDate();
    let createdMails = [];

    // Iterate over each student ID
    for (const studentId of studentIds) {
        const existingAutomatedMail = await db.automatedMailForParents.findFirst({
            where: {
                studentId: +studentId,
                // teacherId: +teacherId,
                // termSubjectLevelId: +termSubjectLevelId,
                // sectionId: +sectionId,
                sendDate
            }
        });

        // Create AutomatedMailForParents record if it does not exist
        if (!existingAutomatedMail?.id) {
            const newMail = await db.automatedMailForParents.create({
                data: {
                    studentId: +studentId,
                    teacherId: +teacherId,
                    termSubjectLevelId: +termSubjectLevelId,
                    sectionId: +sectionId,
                    className,
                    roomName,
                    classTime,
                    sendDate,
                    isSent: false
                }
            });
            createdMails.push(newMail);
        }
    }

    return createdMails;
}

/*get all automated emails for parenst for students in a class*/
export async function findAutomatedMail(studentIds: string[], termSubjectLevelId: string, sectionId: string, teacherId: string) {
    const sendDate = setSendDate();
    const numericStudentIds = studentIds.map(Number);
    const mails = await db.automatedMailForParents.findMany({
        where: {
            studentId: { in: numericStudentIds.map((id) => +id) },
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            sendDate, // Ensure sendDate is correctly formatted
            teacherId: +teacherId
        }
    });

    return mails.length;
}
