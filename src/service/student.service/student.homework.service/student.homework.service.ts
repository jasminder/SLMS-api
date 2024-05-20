import { db } from '../../../utils/db.server';

// Service to fetch student homework
export async function fetchStudentHomework(studentId: number, termSubjectLevelId: number, sectionId: number) {
    const studentHomeworks = await db.studentHomework.findMany({
        where: {
            studentId,
            homework: {
                termSubjectLevelId,
                sectionId
            }
        },
        include: {
            homework: true // Include details of the homework assignments
        }
    });

    return studentHomeworks;
}
