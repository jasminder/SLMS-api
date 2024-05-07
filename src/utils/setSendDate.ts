import { db } from './db.server';

export async function calculateSendDate(termSubjectLevelId: string) {
    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true }
    });
    const termSubjectLevel = await db.termSubjectLevel.findUnique({
        where: { id: +termSubjectLevelId },
        include: {
            subject: {
                include: {
                    termSubject: {
                        where: { termId: currentTerm?.id },
                        select: { isOnSunday: true, subject: true, isOnWeekday: true }
                    }
                }
            }
        }
    });

    let sendDate = new Date();
    const day = sendDate.getDay(); // Get current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentHour = sendDate.getHours();
    const currentMinutes = sendDate.getMinutes();
    if (process.env.NODE_ENV == 'production') {
        if (termSubjectLevel?.subject.termSubject[0].isOnSunday) {
            if (day === 0 && (currentHour < 20 || (currentHour === 20 && currentMinutes <= 30))) {
                sendDate.setDate(sendDate.getDate());
                sendDate.setHours(20, 30, 0, 0);
            } else {
                // If it's Sunday past 8:30 PM or any other day, set to next Sunday
                let diff = 7 - day;
                sendDate.setDate(sendDate.getDate() + diff);
                sendDate.setHours(20, 30, 0, 0);
            }
        } else {
            sendDate.setHours(20, 30, 0, 0); // Set the time to 8:30 PM
        }
    }
    sendDate.setHours(20, 30, 0, 0);
    return sendDate;
}
