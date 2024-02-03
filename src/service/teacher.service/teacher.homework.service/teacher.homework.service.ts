import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function getNextSundayAtFourThirty() {
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

export async function createGroupHomework(
    studentId: string,
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    title: string,
    description: string,
    attachments: string[],
    className: string,
    roomName: string,
    classTime: string
) {
    const sendDate = await getNextSundayAtFourThirty();

    const groupHomework = await db.groupHomework.create({
        data: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            title: title,
            description: description,
            attachments: attachments,
            isSent: false,
            sendDate: sendDate
        }
    });

    const existingAutomatedMail = await db.automatedMailForParents.findFirst({
        where: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            sendDate: sendDate
        }
    });

    if (!existingAutomatedMail) {
        await db.automatedMailForParents.create({
            data: {
                studentId: +studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId,
                className: className,
                roomName: roomName,
                sendDate: sendDate,
                isSent: false,
                classTime
            }
        });
    }

    return groupHomework;
}
