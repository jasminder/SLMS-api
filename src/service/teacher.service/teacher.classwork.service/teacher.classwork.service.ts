import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function getNextScheduledDate() {
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

async function updateGroupClassworkAttachments(groupClassworkId: string, classworkDetails: { attachments: string; description: string }[]) {
    const existingGroupClasswork = await db.groupClasswork.findUnique({
        where: { id: +groupClassworkId },
        select: { attachments: true, description: true }
    });

    if (existingGroupClasswork) {
        const updatedAttachments = [...existingGroupClasswork.attachments, ...classworkDetails.map((detail) => detail.attachments)];
        const updatedDescriptions = [...existingGroupClasswork.description, ...classworkDetails.map((detail) => detail.description)];
        await db.groupClasswork.update({
            where: { id: +groupClassworkId },
            data: { attachments: updatedAttachments, description: updatedDescriptions }
        });
    }
}

export async function createGroupClasswork(
    studentIds: string[],
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    title: string,
    classworkDetails: { attachments: string; description: string }[],
    className: string,
    roomName: string,
    classTime: string
) {
    const sendDate = await getNextScheduledDate();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const numericStudentIds = studentIds.map(Number);

    let groupClasswork;
    for (const studentId of numericStudentIds) {
        const existingGroupClasswork = await db.groupClasswork.findFirst({
            where: {
                studentId,
                teacherId: Number(teacherId),
                termSubjectLevelId: Number(termSubjectLevelId),
                title,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                isSent: false
            }
        });

        if (existingGroupClasswork) {
            await updateGroupClassworkAttachments(existingGroupClasswork.id.toString(), classworkDetails);
            groupClasswork = existingGroupClasswork;
        } else {
            groupClasswork = await db.groupClasswork.create({
                data: {
                    studentId,
                    teacherId: +teacherId,
                    termSubjectLevelId: +termSubjectLevelId,
                    title,
                    attachments: classworkDetails.map((detail) => detail.attachments),
                    description: classworkDetails.map((detail) => detail.description),
                    isSent: false,
                    sendDate
                }
            });
        }

        const existingAutomatedMail = await db.automatedMailForParents.findFirst({
            where: {
                studentId: studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                isSent: false
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
    }
    return groupClasswork;
}
