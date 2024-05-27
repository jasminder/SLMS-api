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
    const specificDate = new Date('2024-05-20T00:00:00Z');
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
            date: true
        }
    });

    return { studentCourseDetails, allAutomatedEmails, schoolCA };
}
