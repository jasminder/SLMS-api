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
async function updateGroupHomeworkAttachments(grouphomeworkId: string, homeworkDetails: { attachments: string; description: string }[]) {
    const existingGroupHomework = await db.groupHomework.findUnique({
        where: { id: +grouphomeworkId },
        select: { attachments: true, description: true }
    });

    if (existingGroupHomework) {
        const updatedAttachments = [...existingGroupHomework.attachments, ...homeworkDetails.map((detail) => detail.attachments)];
        const updatedDescriptions = [...existingGroupHomework.description, ...homeworkDetails.map((detail) => detail.description)];
        await db.groupHomework.update({
            where: { id: +grouphomeworkId },
            data: { attachments: updatedAttachments, description: updatedDescriptions }
        });
    }
}

export async function createGroupHomework(
    studentIds: string[],
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    title: string,
    homeworkDetails: { attachments: string; description: string }[],
    className: string,
    roomName: string,
    classTime: string
) {
    const sendDate = await getNextSundayAtFourThirty();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const numericStudentIds = studentIds.map(Number);
    let groupHomework;
    for (const studentId of numericStudentIds) {
        const existingGroupHomework = await db.groupHomework.findFirst({
            where: {
                studentId: studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                title: title,
                // createdAt: {
                //     gte: startDate,
                //     lte: endDate
                // },
                sendDate,
                isSent: false
            }
        });

        if (existingGroupHomework) {
            // Update existing homework's attachments
            await updateGroupHomeworkAttachments(existingGroupHomework.id.toString(), homeworkDetails);
            groupHomework = existingGroupHomework;
        } else {
            groupHomework = await db.groupHomework.create({
                data: {
                    studentId: studentId,
                    teacherId: +teacherId,
                    termSubjectLevelId: +termSubjectLevelId,
                    title: title,
                    attachments: homeworkDetails.map((detail) => detail.attachments),
                    description: homeworkDetails.map((detail) => detail.description), // Assuming 'descriptions' field exists
                    isSent: false,
                    sendDate: sendDate
                }
            });
        }

        const existingAutomatedMail = await db.automatedMailForParents.findFirst({
            where: {
                studentId: studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId,
                // createdAt: {
                //     gte: startDate,
                //     lte: endDate
                // },
                sendDate: sendDate,
                isSent: false
            }
        });
        console.log(existingAutomatedMail);
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
    return groupHomework;
}
