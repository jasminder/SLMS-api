import { NotificationType } from '@prisma/client';
import { customError } from '../../../utils/customError';

import { db } from '../../../utils/db.server';
import { createManyNotificationsAndPush, getStudentNamesMap } from '../../notification.service/notification.service';
import { calculateSendDate } from '../../../utils/setSendDate';
import { assertSendBelongsToClass } from '../../../utils/assertSendBelongsToClass';

function normalizeSendDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(20, 30, 0, 0);
    return normalized;
}

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
    homeworkIds: string[],
    sendDateInput?: string
) {
    await assertSendBelongsToClass('homework', homeworkIds, studentIds, termSubjectLevelId, sectionId);
    const sendDate = sendDateInput
        ? normalizeSendDate(new Date(sendDateInput))
        : await calculateSendDate(termSubjectLevelId);
    const numericStudentIds = studentIds.map(Number);
    let groupHomework;

    if (homeworkIds.length > 0) {
        // One student-homework row for EVERY selected homework (D6 problem 4: only the first one used to get a row, so students
        // missed the rest). Rows that already exist are skipped, so sending the same homework twice does not fail here and does not
        // notify the student a second time; the friendly "already exists" check below still runs.
        const numericHomeworkIds = [...new Set(homeworkIds.map(Number))];
        const existingRows = await db.studentHomework.findMany({
            where: { studentId: { in: numericStudentIds }, homeworkId: { in: numericHomeworkIds } },
            select: { studentId: true, homeworkId: true }
        });
        const existingKeys = new Set(existingRows.map((r) => `${r.studentId}-${r.homeworkId}`));
        const newRows = numericStudentIds.flatMap((studentId) =>
            numericHomeworkIds
                .filter((homeworkId) => !existingKeys.has(`${studentId}-${homeworkId}`))
                .map((homeworkId) => ({ studentId, homeworkId, sendDate, roomName, className, classTime }))
        );
        const transactions = [db.studentHomework.createMany({ data: newRows, skipDuplicates: true })];
        const studentsToNotify = [...new Set(newRows.map((r) => r.studentId))];
        // Find subject here
        const termSubjectLevel = await db.termSubjectLevel.findUnique({
            where: { id: +termSubjectLevelId },
            include: { subject: true }
        });
        const subject = termSubjectLevel?.subject;

        await db.$transaction([...transactions]);
        const hwNames = await getStudentNamesMap(studentsToNotify);
        await createManyNotificationsAndPush(
            studentsToNotify.map((studentId) => ({
                studentId: +studentId,
                type: NotificationType.HOMEWORK,
                content: `${hwNames.get(+studentId) ?? 'Student'}, a new homework has been posted for ${subject?.name || 'your subject'}.`,
                actionUrl: `/student/homework-classwork?studentId=${studentId}`,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId
            }))
        );
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
/**
 * `onlyTeacherId` is set when the caller is a teacher (D6 problem 5): a teacher sees only the groups they made, not those of other
 * teachers for the same class. Admin callers pass nothing and see every group, as before.
 */
export async function findAssignedHomeworks(teacherId: string, termSubjectLevelId: string, sectionId: string, onlyTeacherId?: number) {
    return await db.groupHomework.findMany({
        where: {
            ...(onlyTeacherId !== undefined ? { teacherId: onlyTeacherId } : {}),
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
