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

export async function createFeedback(studentId: string, teacherId: string, termSubjectLevelId: string, sectionId: string, content: string, title: string, className: string, roomName: string) {
    const sendDate = getNextSundayAtFourThirty();

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
            sendDate
        }
    });

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
                isSent: false
            }
        });
    }

    return feedback;
}
