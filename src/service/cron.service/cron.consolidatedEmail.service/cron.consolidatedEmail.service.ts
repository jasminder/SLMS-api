// services/automatedEmailService.ts
import { InteractionType, PrismaClient } from '@prisma/client';
import { sendConsolidatedEmail } from '../../AutomatedEmailForParents.service/AutomatedEmailForParents.service';
import { format } from 'date-fns';

const db = new PrismaClient();

export async function consolidateStudentDataForEmail() {
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const studentsWithPendingMails = await db.student.findMany({
        where: {
            AutomatedMailForParents: {
                some: {
                    isSent: false,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
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
        let feedbackEntries: any[] = [];
        let homeworkEntries: any[] = [];
        let classworkEntries: any[] = [];
        for (const mailEntry of student.AutomatedMailForParents) {
            // Fetching feedback and homework based on the specific class details
            feedbackEntries = await db.feedback.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            homeworkEntries = await db.groupHomework.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            classworkEntries = await db.groupClasswork.findMany({
                where: {
                    isSent: false,
                    studentId: mailEntry.studentId,
                    teacherId: mailEntry.teacherId,
                    termSubjectLevelId: mailEntry.termSubjectLevelId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            // console.log('feedbackEntries', feedbackEntries);
            console.log('homeworkEntries', homeworkEntries);
            console.log('classworkEntries', classworkEntries);
            const teacherName = `${mailEntry.teacher.teacherPersonalDetails?.firstName} ${mailEntry.teacher.teacherPersonalDetails?.lastName}`;
            const feedbackContent = feedbackEntries.length > 0 ? feedbackEntries.map((f) => f.content).join('\n') : 'No feedback';
            emailContent += `Class: ${mailEntry.className}\n` + `Room: ${mailEntry.roomName}\n` + `Class Time: ${mailEntry.classTime}\n` + `Teacher: ${teacherName}\n\n`;
            // Append classwork attachments
            let classworkAttachments = classworkEntries.flatMap((c) =>
                c.attachments.map((url: any) => ({
                    path: url,
                    filename: url.split('/').pop() ?? ''
                }))
            );
            if (classworkEntries.length === 0) {
                emailContent += '\nNo Classwork\n';
            } else {
                emailContent += '\nClasswork:\n';
                for (const [index, c] of classworkEntries.entries()) {
                    if (c.description.length === 0 || (c.description.length === 1 && c.description[0] === '')) {
                        emailContent += `${index + 1}) Classwork attached\n`;
                    } else {
                        c.description.forEach((desc: string, descIndex: number) => {
                            if (desc === '') {
                                emailContent += `${descIndex + 1}) Please find the attachment-${extractOriginalFileNameFromS3Url(classworkAttachments[descIndex].path)}\n`;
                            } else {
                                emailContent += `${descIndex + 1}) ${desc}\n`;
                            }
                        });
                    }
                    emailContent += '\n';
                }
            }

            // + `Feedback:\n${feedbackContent}\n`;

            // homeworkEntries.map((h) => h.description).join('\n') +
            // '\n\n';
            let homeworkAttachments = homeworkEntries.flatMap((h) =>
                h.attachments.map((url: any) => ({
                    path: url,
                    filename: url.split('/').pop() ?? ''
                }))
            );

            attachments = [...attachments, ...homeworkAttachments];

            emailContent += 'Homework:\n';
            if (homeworkEntries.length === 0) {
                emailContent += 'No Homework\n';
            } else {
                for (const [index, h] of homeworkEntries.entries()) {
                    if (h.description.length === 0 || (h.description.length === 1 && h.description[0] === '')) {
                        emailContent += `${index + 1}) Homework attached\n`;
                    } else {
                        h.description.forEach((desc: string, descIndex: number) => {
                            if (desc === '') {
                                emailContent += `${descIndex + 1}) Please find the attachment-${extractOriginalFileNameFromS3Url(homeworkAttachments[descIndex].path)}\n`;
                            } else {
                                emailContent += `${descIndex + 1}) ${desc}\n`;
                            }
                        });
                    }
                    emailContent += '\n';
                }
            }

            attachments = [...attachments, ...classworkAttachments];

            // if (classworkEntries.length === 0) {
            //     emailContent += '\nNo Classwork\n';
            // } else {
            //     emailContent += '\nClasswork:\n';
            //     for (const [index, c] of classworkEntries.entries()) {
            //         if (c.description.length === 0 || (c.description.length === 1 && c.description[0] === '')) {
            //             emailContent += `${index + 1}) Classwork attached\n`;
            //         } else {
            //             c.description.forEach((desc: string, descIndex: number) => {
            //                 if (desc === '') {
            //                     emailContent += `${descIndex + 1}) Please find the attachment-${extractOriginalFileNameFromS3Url(classworkAttachments[descIndex].path)}\n`;
            //                 } else {
            //                     emailContent += `${descIndex + 1}) ${desc}\n`;
            //                 }
            //             });
            //         }
            //         emailContent += '\n';
            //     }
            // }
            emailContent += `Feedback:\n${feedbackContent}\n`;
            emailContent += '\nAkaal Shaoui Gurmat Vidyala.\n' + '1565 Western Port Highway\n' + 'Langwarrin VIC 3910\n' + 'Mobile: 0433029912\n';
        }
        console.log('emailContent', emailContent);

        if (student.personalDetails?.email) {
            await sendConsolidatedEmail(student.personalDetails.email, 'Your Academic Update', emailContent, attachments);

            // Update the isSent flag for Feedback, GroupHomework, and AutomatedMailForParents

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
                        description: 'Consolidated email with feedback and homework & classwor sent',
                        contactedDate: new Date(),
                        createdBy: firstMailEntry.teacherId
                    }
                });
            }
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
