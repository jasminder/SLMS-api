//admin.notice.service

import { db } from '../../../utils/db.server';

export async function createNotice(adminId: string, title: string, content: string) {
    const newNotice = await db.notice.create({
        data: {
            adminId: +adminId,
            title,
            content
        }
    });
    // Fetch all teacher IDs
    const teachers = await db.teacher.findMany({
        select: { id: true } // Select only the ID
    });
    for (const teacher of teachers) {
        await db.noticeAcknowledgement.create({
            data: {
                noticeId: newNotice.id,
                teacherId: teacher.id,
                isSeen: false
            }
        });
    }
    return newNotice;
}
// for admin to view all notices
export async function getAllNotices() {
    const notices = await db.notice.findMany({
        include: {
            acknowledgements: true
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    return notices;
}

export async function deleteNotice(noticeId: string) {
    const notice = await db.notice.findUnique({ where: { id: +noticeId } });
    if (!notice) {
        throw new Error('Notice not found');
    }
    await db.noticeAcknowledgement.deleteMany({
        where: { id: +noticeId }
    });
    await db.notice.delete({
        where: { id: +noticeId }
    });
}
// for teacher to show the unseen notice
export async function getUnseenNotices(teacherId: string) {
    const notices = await db.notice.findMany({
        where: {
            acknowledgements: {
                some: {
                    teacherId: +teacherId,
                    isSeen: false
                }
            }
        },
        orderBy: { createdAt: 'asc' },
        include: {
            acknowledgements: {
                where: { teacherId: +teacherId, isSeen: false },
                select: { isSeen: true }
            }
        }
    });

    return notices;
}
// to view notice detail for admin
export async function getNotice(noticeId: string) {
    return await db.notice.findUnique({
        where: { id: +noticeId }
    });
}
// admin tp update notice
export async function updateNotice(noticeId: string, title: string, content: string) {
    const notice = await db.notice.findUnique({ where: { id: +noticeId } });
    if (!notice) {
        throw new Error('Notice not found');
    }

    const updatedNotice = await db.notice.update({
        where: { id: +noticeId },
        data: { title, content }
    });

    return updatedNotice;
}
// admin to reset the notcie so that it will be shown to teacher
export async function resetNoticeViews(noticeId: string) {
    await db.noticeAcknowledgement.updateMany({
        where: {
            noticeId: +noticeId,
            isSeen: true
        },
        data: {
            isSeen: false,
            seenAt: null // Resetting the seenAt timestamp, if applicable
        }
    });
}
//to update whether teacher has seen the notice
export async function acknowledgeNotice(noticeId: string, teacherId: string) {
    // Update the NoticeAcknowledgement for this teacher and notice
    await db.noticeAcknowledgement.updateMany({
        where: {
            noticeId: +noticeId,
            teacherId: +teacherId,
            isSeen: false
        },
        data: {
            isSeen: true,
            seenAt: new Date() // Set this to the current time
        }
    });
}

// ---------------------------student notice---------------------------
export async function createStudentNotice(adminId: string, title: string, content: string) {
    return db.$transaction(async (prisma) => {
        const newNotice = await prisma.studentNotice.create({
            data: {
                adminId: +adminId,
                title,
                content
            }
        });

        // Fetch all active, student role, allowed login student IDs
        const activeStudents = await prisma.student.findMany({
            where: {
                isActive: true,
                role: 'STUDENT',
                isAllowedLogin: true
            },
            select: { id: true } // Select only the ID
        });

        // Prepare acknowledgements for each student
        const acknowledgementPromises = activeStudents.map((student) => {
            return prisma.studentNoticeAcknowledgement.create({
                data: {
                    studentNoticeId: newNotice.id,
                    studentId: student.id,
                    isSeen: false
                }
            });
        });

        // Execute all the acknowledgements creation in parallel
        await Promise.all(acknowledgementPromises);

        return newNotice;
    });
}
export async function getAllStudentNotices() {
    const notices = await db.studentNotice.findMany({
        include: {
            studentAcknowledgement: true
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
    return notices;
}

export async function deleteStudentNotice(noticeId: string) {
    // Start a transaction
    const transaction = await db.$transaction(async (prisma) => {
        // First, delete all related acknowledgements
        await prisma.studentNoticeAcknowledgement.deleteMany({
            where: {
                studentNoticeId: +noticeId
            }
        });

        // Then, delete the notice itself
        const deletedNotice = await prisma.studentNotice.delete({
            where: {
                id: +noticeId
            }
        });

        return deletedNotice;
    });

    return transaction;
}
export async function getStudentNotice(noticeId: string) {
    return await db.studentNotice.findUnique({
        where: { id: +noticeId }
    });
}
export async function updateStudentNotice(noticeId: string, title: string, content: string) {
    const notice = await db.notice.findUnique({ where: { id: +noticeId } });
    if (!notice) {
        throw new Error('Notice not found');
    }

    const updatedNotice = await db.studentNotice.update({
        where: { id: +noticeId },
        // data: {
        //     ...(title && { title }), // Only include title if provided
        //     ...(content && { content }) // Only include content if provided
        // }
        data: { title, content }
    });

    return updatedNotice;
}
