import { PrismaClient } from '@prisma/client';
import { customError } from '../../../utils/customError';
import { setSendDate } from '../../../utils/setSendDate';

const db = new PrismaClient();



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
    classworkDetails: { attachments: string[]; description: string; fileNames: string[]; classworkId: string }[],
    className: string,
    roomName: string,
    classTime: string,
    classworkIds: string[]
) {
    const sendDate = await setSendDate();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const numericStudentIds = studentIds.map(Number);

    let groupClasswork;
    for (const studentId of numericStudentIds) {
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
                sendDate: sendDate
            }
        });

        if (!existingAutomatedMail?.id) {
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
        } else if (existingAutomatedMail?.isSent) {
            throw customError('Mails are sent for today. Please assign homework/classwork on the next working day.', 'fail', 404, true);
        }
        let existingGroupClasswork = false;
        for (const classworkId of classworkIds) {
            const found = await db.classworkSnapshot.findFirst({
                where: {
                    classworkId: +classworkId,
                    groupClasswork: {
                        studentId: studentId,
                        teacherId: +teacherId,
                        termSubjectLevelId: +termSubjectLevelId,
                        sendDate,
                        sectionId: +sectionId
                        // Add other necessary conditions if needed
                    }
                }
            });

            if (found) {
                existingGroupClasswork = true;
                break;
            }
        }
        if (existingGroupClasswork) {
            throw customError('classwork with the selected classwork already exists for this student.', 'fail', 404, true);
        }
        groupClasswork = await db.groupClasswork.create({
            data: {
                studentId: studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                title: title,
                attachments: classworkDetails.flatMap((detail) => detail.attachments),
                description: classworkDetails.map((detail) => detail.description),
                isSent: false,
                sendDate: sendDate,
                sectionId: +sectionId
            }
        });
        // Create ClassworkSnapshot for each Classwork ID
        for (const classworkId of classworkIds) {
            const matchingDes = classworkDetails.find((detail) => detail.classworkId === classworkId);

            if (matchingDes) {
                await db.classworkSnapshot.create({
                    data: {
                        classworkId: +classworkId,
                        groupClassworkId: groupClasswork.id,
                        description: matchingDes.description || '',
                        fileNames: matchingDes.fileNames || [],
                        attachments: matchingDes.attachments,
                        sendDate
                    }
                });
            }
        }
        /*********/
    }
    return groupClasswork;
}

/*get assignedclassworks*/
export async function findAssignedClassworks(teacherId: string, termSubjectLevelId: string, sectionId: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    return await db.groupClasswork.findMany({
        where: {
            teacherId: parseInt(teacherId),
            termSubjectLevelId: parseInt(termSubjectLevelId),
            sectionId: parseInt(sectionId),
            // createdAt: {
            //     gte: startDate,
            //     lte: endDate
            // }
        },
        include: {
            ClassworkSnapshot: {
                select: {
                    fileNames: true,
                    sendDate: true,
                    description: true,
                    groupClasswork: {
                        select: {
                            isSent: true
                        }
                    },
                    classwork: true
                }
            },
            student: {
                select: {
                    personalDetails: true
                }
            },
            teacher: {
                select: {
                    teacherPersonalDetails: true
                }
            },
            SentClassworkSnapshot: {
                select: {
                    fileNames: true,
                    sendDate: true,
                    description: true,
                    groupClasswork: {
                        select: {
                            isSent: true
                        }
                    },
                    classwork: true,
                    attachments: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
}
