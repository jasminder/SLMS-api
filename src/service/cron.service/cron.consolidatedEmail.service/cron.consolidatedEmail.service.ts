// services/automatedEmailService.ts
import { InteractionType, PrismaClient } from '@prisma/client';
import { sendConsolidatedEmail } from '../../AutomatedEmailForParents.service/AutomatedEmailForParents.service';
import { format } from 'date-fns';

const db = new PrismaClient();

export async function consolidateStudentDataForEmail() {
    console.log('start consolidateStudentDataForEmail');
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
    console.log('studentsWithPendingMails', studentsWithPendingMails);
    for (const student of studentsWithPendingMails) {
        const attendanceToday = student.schoolCheckInAttendance[0]; // Assuming only one record per day
        const attendanceStatus = attendanceToday?.checkedIn ? 'Present' : 'Absent';
        const checkInTime = attendanceToday?.checkInTime ? (attendanceToday.checkInTime, 'HH:mm') : 'Not Applicable';
        const checkOutTime = attendanceToday?.checkOutTime ? format(attendanceToday.checkOutTime, 'HH:mm') : 'Not Applicable';

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
            // console.log('feedbackEntries', feedbackEntries);
            console.log('homeworkEntries', homeworkEntries);
            const teacherName = `${mailEntry.teacher.teacherPersonalDetails?.firstName} ${mailEntry.teacher.teacherPersonalDetails?.lastName}`;

            emailContent +=
                `Class: ${mailEntry.className}\n` +
                `Room: ${mailEntry.roomName}\n` +
                `Class Time: ${mailEntry.classTime}\n` +
                `Teacher: ${teacherName}\n\n` +
                `Feedback:\n` +
                feedbackEntries.map((f) => f.content).join('\n');

            // homeworkEntries.map((h) => h.description).join('\n') +
            // '\n\n';
            emailContent += '\n\nHomework:\n';
            for (const [index, h] of homeworkEntries.entries()) {
                if (h.description.length === 0 || (h.description.length === 1 && h.description[0] === '')) {
                    emailContent += `${index + 1}) Homework attached\n`;
                } else {
                    h.description.forEach((desc: string, descIndex: number) => {
                        if (desc === '') {
                            emailContent += `${index + 1}.${descIndex + 1}) Please find the attachment\n`;
                        } else {
                            emailContent += `${index + 1}.${descIndex + 1}) ${desc}\n`;
                        }
                    });
                }
                emailContent += '\n'; // Adds an extra line after each homework entry
            }
            let homeworkAttachments = homeworkEntries.flatMap((h) =>
                h.attachments.map((url: any) => ({
                    path: url,
                    filename: url.split('/').pop() ?? ''
                }))
            );

            attachments = [...attachments, ...homeworkAttachments];
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
                        description: 'Consolidated email with feedback and homework entries sent',
                        contactedDate: new Date(),
                        createdBy: firstMailEntry.teacherId
                    }
                });
            }
        }
    }
}
