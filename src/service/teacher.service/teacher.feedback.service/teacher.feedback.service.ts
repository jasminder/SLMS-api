import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

function getNextSundayAtFourThirty() {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay())); // Set to next Sunday
    nextSunday.setHours(16, 30, 0, 0); // Set to 4:30 PM

    // If it's already past 4:30 PM on Sunday, set to the Sunday of the next week
    if (now > nextSunday) {
        nextSunday.setDate(nextSunday.getDate() + 7);
    }

    return nextSunday;
}

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
    const sendDate = getNextSundayAtFourThirty();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    // Create feedback
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

    // Check for existing AutomatedMailForParents record
    const existingAutomatedMail = await db.automatedMailForParents.findFirst({
        where: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId, // Assuming sectionId is part of your feedback model or derived somehow
            // createdAt: {
            //     gte: startDate,
            //     lte: endDate
            // }
            sendDate
        }
    });

    // console.log(existingAutomatedMail);
    // console.log(studentId, teacherId, termSubjectLevelId, sectionId, sendDate);
    // Create AutomatedMailForParents record if it does not exist
    if (!existingAutomatedMail) {
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
    }

    return feedback;
}
