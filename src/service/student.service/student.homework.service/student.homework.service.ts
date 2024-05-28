import { db } from '../../../utils/db.server';

export async function fetchStudentHomework(studentId: number, termSubjectLevelId: number, sectionId: number) {
    const studentCourseDetails = await db.student.findUnique({
        where: {
            id: studentId
        },
        include: {
            studentHomework: {
                where: {
                    homework: {
                        termSubjectLevelId: termSubjectLevelId,
                        sectionId: sectionId
                    }
                },
                include: {
                    homework: true
                }
            },
            studentClasswork: {
                where: {
                    classwork: {
                        termSubjectLevelId: termSubjectLevelId,
                        sectionId: sectionId
                    }
                },
                include: {
                    classwork: true
                }
            },
            feedback: {
                where: {
                    termSubjectLevelId: termSubjectLevelId,
                    sectionId: sectionId
                }
            }
        }
    });
    const specificDate = new Date('2024-05-25T00:00:00Z');
    const allAutomatedEmails = await db.automatedMailForParents.findMany({
        where: {
            studentId,
            sendDate: {
                gt: specificDate
            }
        }
    });
    const schoolCA = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId,
            date: {
                gt: specificDate
            }
        },
        select: {
            date: true,
            classAttendance: {
                where: {
                    studentClassAssignment: {
                        termSubjectLevelId,
                        sectionId
                    }
                },
                select: {
                    date: true,
                    attendanceStatus: true
                }
            }
        }
    });

    return { studentCourseDetails, allAutomatedEmails, schoolCA };
}
export async function fetchStudentReport(studentId: number) {
    const studentCourseDetails = await db.student.findUnique({
        where: {
            id: studentId
        },
        include: {
            studentHomework: {
                include: {
                    homework: true
                }
            },
            studentClasswork: {
                include: {
                    classwork: true
                }
            },
            feedback: true
        }
    });
    const specificDate = new Date('2024-05-25T00:00:00Z');
    const allAutomatedEmails = await db.automatedMailForParents.findMany({
        where: {
            studentId,
            sendDate: {
                gt: specificDate
            }
        }
    });
    const schoolCA = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId,
            date: {
                gt: specificDate
            }
        },
        include: {
            classAttendance: {
                include: {
                    studentClassAssignment: true
                }
            }
        }
    });

    return { studentCourseDetails, allAutomatedEmails, schoolCA };
}
