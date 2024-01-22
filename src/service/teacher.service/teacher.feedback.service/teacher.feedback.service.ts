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

export async function createFeedback(studentId: string, teacherId: string, content: string, title: string) {
    const sendDate = getNextSundayAtFourThirty();

    return await db.feedback.create({
        data: {
            student: {
                connect: { id: +studentId }
            },
            teacher: {
                connect: { id: +teacherId }
            },
            content,
            title,
            sendDate,
            isSent: false
        }
    });
}
