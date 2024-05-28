import { customError } from '../../../utils/customError';

import { db } from '../../../utils/db.server';
import { calculateSendDate } from '../../../utils/setSendDate';

export async function createGroupHomework(
    studentIds: string[],
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    title: string,
    homeworkDetails: { attachments: string[]; description: string; fileNames: string[]; homeworkId: string }[],
    className: string,
    roomName: string,
    classTime: string,
    homeworkIds: string[]
) {
    const sendDate = await calculateSendDate(termSubjectLevelId);
    console.log(sendDate);
    const numericStudentIds = studentIds.map(Number);
    let groupHomework;
    if (homeworkIds.length > 0) {
        const transactions = studentIds.map((studentId) => {
            return db.studentHomework.create({
                data: {
                    studentId: +studentId,
                    homeworkId: +homeworkIds[0],
                    sendDate,
                    roomName,
                    className,
                    classTime
                }
            });
        });
        await db.$transaction(transactions);
    }
    for (const studentId of numericStudentIds) {
        const existingAutomatedMail = await db.automatedMailForParents.findFirst({
            where: {
                studentId: studentId,
                // teacherId: +teacherId,
                // termSubjectLevelId: +termSubjectLevelId,
                // sectionId: +sectionId,
                // createdAt: {
                //     gte: startDate,
                //     lte: endDate
                // },
                sendDate: sendDate
            }
        });
        // console.log(existingAutomatedMail);
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
        let existingGroupHomework = false;
        for (const homeworkId of homeworkIds) {
            const found = await db.homeworkSnapshot.findFirst({
                where: {
                    homeworkId: +homeworkId,
                    groupHomework: {
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
                existingGroupHomework = true;
                break;
            }
        }

        if (existingGroupHomework) {
            throw customError('Homework with the selected homework  already exists for this student.', 'fail', 404, true);
        }
        groupHomework = await db.groupHomework.create({
            data: {
                studentId: studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                title: title,
                attachments: homeworkDetails.flatMap((detail) => detail.attachments),
                description: homeworkDetails.map((detail) => detail.description),
                isSent: false,
                sendDate: sendDate,
                sectionId: +sectionId
            }
        });
        // console.log(groupHomework, 'groupHomework');
        // }
        // Create HomeworkSnapshot for each Homework ID
        for (const homeworkId of homeworkIds) {
            const matchingDes = homeworkDetails.find((detail) => detail.homeworkId === homeworkId);

            if (matchingDes) {
                await db.homeworkSnapshot.create({
                    data: {
                        homeworkId: +homeworkId,
                        groupHomeworkId: groupHomework.id,
                        description: matchingDes.description || '',
                        fileNames: matchingDes.fileNames || [],
                        attachments: matchingDes.attachments,
                        sendDate
                    }
                });
            }
        }
    }
    return groupHomework;
}
/*get assignedhomeworks*/
export async function findAssignedHomeworks(teacherId: string, termSubjectLevelId: string, sectionId: string) {
    return await db.groupHomework.findMany({
        where: {
            // teacherId: parseInt(teacherId),
            termSubjectLevelId: parseInt(termSubjectLevelId),
            sectionId: parseInt(sectionId)
            // createdAt: {
            //     gte: startDate,
            //     lte: endDate
            // }
        },
        include: {
            HomeworkSnapshot: {
                select: {
                    fileNames: true,
                    sendDate: true,
                    description: true,
                    groupHomework: {
                        select: {
                            isSent: true
                        }
                    },
                    homework: true
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
            SentHomeworkSnapshot: {
                select: {
                    fileNames: true,
                    sendDate: true,
                    description: true,
                    groupHomework: {
                        select: {
                            isSent: true
                        }
                    },
                    homework: true,
                    attachments: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
}
