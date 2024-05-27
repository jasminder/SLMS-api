import { db } from '../../../utils/db.server';

export async function fetchStudentClasswork(studentId: number, termSubjectLevelId: number, sectionId: number) {
    const studentClassworks = await db.studentClasswork.findMany({
        where: {
            studentId,
            classwork: {
                termSubjectLevelId,
                sectionId
            },
            // sendDate: {
            //     lte: new Date()
            // }
        },
        include: {
            classwork: {
                include: {
                    subject: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            classwork: {
                createdAt: 'desc'
            }
        }
    });

    return studentClassworks;
}
