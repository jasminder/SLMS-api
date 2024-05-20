import { db } from '../../../utils/db.server';

export async function fetchStudentClasswork(studentId: number, termSubjectLevelId: number, sectionId: number) {
    const studentClassworks = await db.studentClasswork.findMany({
        where: {
            studentId,
            classwork: {
                termSubjectLevelId,
                sectionId
            }
        },
        include: {
            classwork: true // Include details of the classwork assignments
        }
    });

    return studentClassworks;
}
