import { db } from '../../../utils/db.server';

// Service to fetch student homework
export async function fetchStudentHomework(studentId: number, termSubjectLevelId: number, sectionId: number) {
    console.log(studentId, termSubjectLevelId, sectionId)
    const studentHomeworks = await db.studentHomework.findMany({
        where: {
            studentId,
            homework: {
                termSubjectLevelId,
                sectionId
            }
        },
        include: {
            homework: {
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
            homework: {
                createdAt: 'desc'
            }
        }
    });
    console.log(studentHomeworks);
    return studentHomeworks;
}
