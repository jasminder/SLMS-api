import { NotificationType, Prisma } from '@prisma/client';
import { db } from '../../utils/db.server';
import { sendPushToStudents } from '../push.notification.service/push.notification.service';

type NotificationCreateInput = Prisma.NotificationUncheckedCreateInput;

function getPushTitle(type: NotificationType, explicitTitle?: string | null) {
    if (explicitTitle && explicitTitle.trim()) {
        return explicitTitle;
    }

    switch (type) {
        case NotificationType.ATTENDANCE:
            return 'Attendance Update';
        case NotificationType.HOMEWORK:
            return 'New Homework';
        case NotificationType.CLASSWORK:
            return 'New Classwork';
        case NotificationType.FEEDBACK:
            return 'New Feedback';
        case NotificationType.FEE:
            return 'Fee Update';
        case NotificationType.FEEOVERDUE:
            return 'Fee Overdue';
        case NotificationType.EVENT:
            return 'New Event';
        case NotificationType.MESSAGE:
            return 'New Message';
        default:
            return 'Notification';
    }
}

export async function createNotificationAndPush(data: NotificationCreateInput) {
    const notification = await db.notification.create({ data });
    await sendPushToStudents([notification.studentId], getPushTitle(notification.type, notification.title), notification.content, {
        notificationId: String(notification.id),
        notificationType: notification.type
    });
    return notification;
}

export async function createManyNotificationsAndPush(dataList: NotificationCreateInput[]) {
    if (dataList.length === 0) {
        return [];
    }

    const createdNotifications = await Promise.all(dataList.map((data) => db.notification.create({ data })));
    await Promise.all(
        createdNotifications.map((notification) =>
            sendPushToStudents([notification.studentId], getPushTitle(notification.type, notification.title), notification.content, {
                notificationId: String(notification.id),
                notificationType: notification.type
            })
        )
    );

    return createdNotifications;
}
