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

export async function getAllNotices() {
    const notices = await db.notice.findMany({
        include: {
            acknowledgements: true
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

export async function getNotice(noticeId: string) {
    return await db.notice.findUnique({
        where: { id: +noticeId }
    });
}

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

export async function resetNoticeViews(noticeId: string) {
    await db.noticeAcknowledgement.updateMany({
        where: {
            id: +noticeId,
            isSeen: true
        },
        data: {
            isSeen: false,
            seenAt: null // Resetting the seenAt timestamp, if applicable
        }
    });
}
