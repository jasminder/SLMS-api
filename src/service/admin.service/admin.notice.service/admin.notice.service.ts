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

    return newNotice;
}

export async function getAllNotices() {
    const notices = await db.notice.findMany({});

    return notices;
}

export async function deleteNotice(noticeId: string) {
    const notice = await db.notice.findUnique({ where: { id: +noticeId } });
    if (!notice) {
        throw new Error('Notice not found');
    }

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
