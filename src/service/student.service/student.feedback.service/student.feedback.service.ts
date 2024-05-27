import { db } from '../../../utils/db.server';

export async function getFeedbackForStudent(studentId: string, termSubjectLevelId: string) {
    const feedback = await db.feedback.findMany({
        where: {
            studentId: +studentId,
            termSubjectLevelId: +termSubjectLevelId,
            // sendDate: {
            //     lte: new Date()
            // }
        }
    });

    return feedback;
}
