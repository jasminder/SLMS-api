// services/automatedEmailService.ts
import { InteractionType, PrismaClient } from '@prisma/client';
import { sendConsolidatedEmail } from '../../AutomatedEmailForParents.service/AutomatedEmailForParents.service';
import { format } from 'date-fns';
import { capitalizeFirstCharacter } from '../../../utils/capitalizeFirstCharacter';

import { GroupHomework, GroupClasswork, Feedback, HomeworkSnapshot, ClassworkSnapshot } from '@prisma/client';

const db = new PrismaClient();

export async function consolidateStudentDataForEmail() {
    const sendDate = new Date();
    sendDate.setHours(20, 30, 0, 0);
    const today = new Date();
    const formattedDate = format(today, 'dd-MM-yyyy');
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const studentsWithPendingMails = await db.student.findMany({
        where: {
            AutomatedMailForParents: {
                some: {
                    isSent: false,
                    // createdAt: {
                    //     gte: startDate,
                    //     lte: endDate
                    // }
                    sendDate
                }
            }
        },
        include: {
            personalDetails: true,
            schoolCheckInAttendance: {
                where: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    },
                    isMarked: true
                }
            },
            AutomatedMailForParents: {
                where: { isSent: false },
                include: {
                    teacher: { include: { teacherPersonalDetails: true } },
                    termSubjectLevel: true,
                    section: true
                    // Feedback and GroupHomework are filtered based on the specific mailEntry details
                }
            }
        }
    });

    for (const student of studentsWithPendingMails) {
        const attendanceToday = student.schoolCheckInAttendance[0]; // Assuming only one record per day
        const attendanceStatus = attendanceToday?.checkedIn ? 'Present' : 'Absent';
        const checkInTime = attendanceToday?.checkInTime ? format(new Date(attendanceToday.checkInTime), 'dd-MM-yyyy hh:mm a') : 'Not Applicable';
        const checkOutTime = attendanceToday?.checkOutTime ? format(new Date(attendanceToday.checkOutTime), 'dd-MM-yyyy hh:mm a') : 'Not Applicable';

        let emailContent =
            `Dear Parents,\n\n` +
            `Please find below the student report for ${student.id}, ${student.personalDetails?.firstName} ${student.personalDetails?.lastName}\n\n` +
            `Date: ${formattedDate}\n` +
            `Attendance Status: ${attendanceStatus}\n` +
            `Check-in Time: ${checkInTime}\n` +
            `Check-out Time: ${checkOutTime}\n\n`;

        let attachments: { path: string; filename: string }[] = [];
        let feedbackEntries: Feedback[] = [];
        let homeworkEntries: GroupHomework[] = [];
        let classworkEntries: GroupClasswork[] = [];
        let feedbackContent;
        for (const mailEntry of student.AutomatedMailForParents) {
            // Fetching feedback and homework based on the specific class details
            feedbackEntries = await db.feedback.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    // createdAt: {
                    //     gte: startDate,
                    //     lte: endDate
                    // }
                    sendDate
                }
            });

            homeworkEntries = await db.groupHomework.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    // createdAt: {
                    //     gte: startDate,
                    //     lte: endDate
                    // }
                    sendDate
                }
            });
            classworkEntries = await db.groupClasswork.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    // createdAt: {
                    //     gte: startDate,
                    //     lte: endDate
                    // }
                    sendDate
                }
            });
            // // console.log('feedbackEntries', feedbackEntries);
            // console.log('homeworkEntries', homeworkEntries);
            // console.log('classworkEntries', classworkEntries);
            const teacherName = `${mailEntry.teacher.teacherPersonalDetails?.firstName} ${mailEntry.teacher.teacherPersonalDetails?.lastName}`;
            feedbackContent = feedbackEntries.length > 0 ? feedbackEntries.map((f) => f.content).join('\n') : '';
            emailContent += centerSeparator('-----------------------------------------------------------') + '\n';
            emailContent += `Class: ${mailEntry.className}\n` + `Room: ${mailEntry.roomName}\n` + `Class Time: ${mailEntry.classTime}\n` + `Teacher: ${teacherName}\n\n`;
            // Append classwork attachments

            /**/
            let classworkSnapshots: ClassworkSnapshot[] = [];
            for (const classworkEntry of classworkEntries) {
                const snapshots = await db.classworkSnapshot.findMany({
                    where: { groupClassworkId: classworkEntry.id }
                });
                classworkSnapshots.push(...snapshots);
            }
            let classworkAttachments = classworkSnapshots.flatMap((snapshot) =>
                snapshot.attachments.map((url) => ({
                    path: url,
                    filename: extractOriginalFileNameFromS3Url(url) ?? ''
                    // filename: url.split('/').pop() ?? ''
                }))
            );
            attachments = [...attachments, ...classworkAttachments];
            emailContent += 'Classwork:\n';
            if (classworkEntries.length === 0) {
                emailContent += '\n\n';
                // emailContent += 'No Classwork today\n\n';
            } else {
                for (const [cwIndex, classwork] of classworkEntries.entries()) {
                    const classworkSnapshots = await db.classworkSnapshot.findMany({
                        where: {
                            groupClassworkId: classwork.id
                        }
                    });

                    if (classworkSnapshots.length === 0) {
                        emailContent += `\n`;
                    } else {
                        for (const snapshot of classworkSnapshots) {
                            emailContent += `${cwIndex + 1}) `; // Prefix for each homework entry
                            if (!snapshot.description || snapshot.description.length === 0) {
                                emailContent += 'No Description. Please find the attachment(s):\n';
                            } else {
                                emailContent += `Description: ${snapshot.description}\n`;
                            }

                            if (snapshot.attachments.length === 0) {
                                emailContent += `No attachments.\n`;
                            } else {
                                for (const [attIndex, attachmentUrl] of snapshot.attachments.entries()) {
                                    emailContent += `Attachment-${attIndex + 1}: ${extractOriginalFileNameFromS3Url(attachmentUrl)}\n`;
                                }
                            }
                            emailContent += '\n'; // New line for separation between homework entries
                        }
                    }
                }
            }
            /**********/

            /**/

            let homeworkSnapshots: HomeworkSnapshot[] = [];
            for (const homeworkEntry of homeworkEntries) {
                const snapshots = await db.homeworkSnapshot.findMany({
                    where: { groupHomeworkId: homeworkEntry.id }
                });
                homeworkSnapshots.push(...snapshots);
            }

            // Extract attachments from HomeworkSnapshots
            let homeworkAttachments = homeworkSnapshots.flatMap((snapshot) =>
                snapshot.attachments.map((url) => ({
                    path: url,
                    filename: extractOriginalFileNameFromS3Url(url) ?? ''
                    // filename: url.split('/').pop() ?? ''
                }))
            );
            attachments = [...attachments, ...homeworkAttachments];

            emailContent += 'Homework:\n';
            if (homeworkEntries.length === 0) {
                emailContent += '\n\n';
                // emailContent += 'No Homework today\n\n';
            } else {
                for (const [hwIndex, homework] of homeworkEntries.entries()) {
                    const homeworkSnapshots = await db.homeworkSnapshot.findMany({
                        where: {
                            groupHomeworkId: homework.id
                        }
                    });

                    if (homeworkSnapshots.length === 0) {
                        emailContent += `\n`;
                    } else {
                        for (const snapshot of homeworkSnapshots) {
                            emailContent += `${hwIndex + 1}) `; // Prefix for each homework entry
                            if (!snapshot.description || snapshot.description.length === 0) {
                                emailContent += 'No Description. Please find the attachment(s):\n';
                            } else {
                                emailContent += `Description: ${snapshot.description}\n`;
                            }

                            if (snapshot.attachments.length === 0) {
                                emailContent += `No attachments.\n`;
                            } else {
                                for (const [attIndex, attachmentUrl] of snapshot.attachments.entries()) {
                                    emailContent += `Attachment-${attIndex + 1}: ${extractOriginalFileNameFromS3Url(attachmentUrl)}\n`;
                                }
                            }
                            emailContent += '\n'; // New line for separation between homework entries
                        }
                    }
                }
            }

            // attachments = [...attachments, ...classworkAttachments];

            emailContent += `Feedback:\n${feedbackContent}\n`;

            // emailContent += '\nAkaal Shaoui Gurmat Vidyala.\n' + '1565 Western Port Highway\n' + 'Langwarrin VIC 3910\n' + 'Mobile: 0433029912\n';
        }
        emailContent += centerSeparator('-----------------------------------------------------------') + '\n';
        emailContent += '\nAkaal Shaoui Gurmat Vidyala.\n' + '1565 Western Port Highway\n' + 'Langwarrin VIC 3910\n' + 'Mobile: 0433029912\n';
        emailContent += '\nThis is an unmonitored mailbox. For any queries, please contact akaalshaouni@gmail.com\n';

        // console.log('emailContent', emailContent);

        if (student.personalDetails?.email) {
            if (process.env.NODE_ENV == 'production') {
                await sendConsolidatedEmail(
                    student.personalDetails.email,
                    `${capitalizeFirstCharacter(student.personalDetails.firstName)} ${' '}${capitalizeFirstCharacter(student.personalDetails.lastName)} - Your Academic Update`,
                    emailContent,
                    attachments
                );
            }

            for (const homeworkEntry of homeworkEntries) {
                const snapshots = await db.homeworkSnapshot.findMany({
                    where: { groupHomeworkId: homeworkEntry.id },
                    include: {
                        homework: {
                            select: {
                                attachments: true
                            }
                        }
                    }
                });
                for (const snapshot of snapshots) {
                    const sentHw = await db.sentHomeworkSnapshot.create({
                        data: {
                            homeworkId: snapshot.homeworkId,
                            groupHomeworkId: snapshot.groupHomeworkId,
                            description: snapshot.description,
                            attachments: snapshot.homework.attachments,
                            fileNames: snapshot.fileNames,
                            sendDate // Current date as the send date
                        }
                    });
                    console.log(sentHw);
                }
            }

            for (const classworkEntry of classworkEntries) {
                const snapshots = await db.classworkSnapshot.findMany({
                    where: { groupClassworkId: classworkEntry.id },
                    include: {
                        classwork: {
                            select: {
                                attachments: true
                            }
                        }
                    }
                });
                for (const snapshot of snapshots) {
                    const sentCw = await db.sentClassworkSnapshot.create({
                        data: {
                            classworkId: snapshot.classworkId,
                            groupClassworkId: snapshot.groupClassworkId,
                            description: snapshot.description,
                            attachments: snapshot.classwork.attachments,
                            fileNames: snapshot.fileNames,
                            sendDate // Current date as the send date
                        }
                    });
                    console.log(sentCw);
                }
            }

            // Sequentially update the isSent flag for Feedback, GroupHomework, and AutomatedMailForParents
            // console.log(feedbackEntries, 'feedbackentries');
            for (const id of feedbackEntries.map((f) => f.id)) {
                // console.log(id, 'feedbackentry id');
                await db.feedback.update({ where: { id }, data: { isSent: true } });
            }
            for (const id of homeworkEntries.map((h) => h.id)) {
                // console.log(id, 'homeworkentries id');
                await db.groupHomework.update({ where: { id }, data: { isSent: true } });
            }
            for (const id of classworkEntries.map((c) => c.id)) {
                await db.groupClasswork.update({ where: { id }, data: { isSent: true } });
            }

            for (const mailEntry of student.AutomatedMailForParents) {
                // console.log(mailEntry, 'Mail entry');
                await db.automatedMailForParents.update({ where: { id: mailEntry.id }, data: { isSent: true } });
            }

            // Create Interaction record
            const firstMailEntry = student.AutomatedMailForParents[0];
            if (firstMailEntry) {
                await db.interaction.create({
                    data: {
                        studentId: student.id,
                        interactionType: InteractionType.AUTOMATED_EMAIL,
                        description: 'Consolidated email with feedback and homework & classwork sent',
                        contactedDate: new Date(),
                        createdBy: firstMailEntry.teacherId
                    }
                });
            }
            await db.emailContent.create({
                data: {
                    studentId: student.id,
                    emailcontent: emailContent,
                    sendDate
                }
            });
        }
    }
}
function extractOriginalFileNameFromS3Url(url: string) {
    if (typeof url !== 'string') {
        console.error('Invalid URL: ', url);
        return '';
    }
    const fileNameMatch = url.match(/\/([^\/]+?)-[a-zA-Z0-9-]+\.(jpg|jpeg|png|pdf|doc|docx)/i);
    return fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : '';
}
function centerSeparator(separator: string) {
    const lineWidth = 70;
    const separatorLength = separator.length;
    const spaces = (lineWidth - separatorLength) / 2;
    return ' '.repeat(Math.floor(spaces)) + separator;
}
