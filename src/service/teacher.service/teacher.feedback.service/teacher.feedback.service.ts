import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';
import { setSendDate } from '../../../utils/setSendDate';


export async function createFeedback(
    studentId: string,
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    content: string,
    title: string,
    className: string,
    roomName: string,
    classTime: string
) {
    const sendDate = setSendDate();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Create feedback

    // Check for existing AutomatedMailForParents record
    const existingAutomatedMail = await db.automatedMailForParents.findFirst({
        where: {
            studentId: +studentId,
            // teacherId: +teacherId,
            // termSubjectLevelId: +termSubjectLevelId,
            // sectionId: +sectionId, // Assuming sectionId is part of your feedback model or derived somehow
            // createdAt: {
            //     gte: startDate,
            //     lte: endDate
            // },
            sendDate
        }
    });

    // console.log(existingAutomatedMail);
    // console.log(studentId, teacherId, termSubjectLevelId, sectionId, sendDate);
    // Create AutomatedMailForParents record if it does not exist
    if (!existingAutomatedMail?.id) {
        await db.automatedMailForParents.create({
            data: {
                studentId: +studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId, // Assuming sectionId is part of your feedback model or derived somehow
                className,
                roomName,
                sendDate,
                isSent: false,
                classTime
            }
        });
    } else if (existingAutomatedMail?.isSent) {
        throw customError('Mails are sent for today. Please assign feedback on the next working day.', 'fail', 404, true);
    }
    const feedback = await db.feedback.create({
        data: {
            student: {
                connect: { id: +studentId }
            },
            teacher: {
                connect: { id: +teacherId }
            },
            termSubjectLevel: {
                connect: { id: +termSubjectLevelId }
            },
            content,
            title,
            sendDate,
            isSent: false
        }
    });
    return feedback;
}
