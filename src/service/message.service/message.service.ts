import { MessageStatus, MessageType, NotificationType } from '@prisma/client';
import { db } from '../../utils/db.server';
import { getIo } from '../../sockets/socket';

export async function sendMessage(content: string, senderId: string, receiverId: string, userType: string) {
    // First, create the message entry
    const message = await db.message.create({
        data: {
            content,
            senderId: +senderId,
            messageType: userType == 'ADMIN' ? MessageType.ADMIN : MessageType.STUDENT // 'ADMIN' or 'STUDENT'
        }
    });

    // Now link the message with the student and admin
    let studentAdminMessage;
    if (userType === 'ADMIN') {
        studentAdminMessage = await db.studentAdminMessage.create({
            data: {
                studentId: +receiverId,
                adminId: +senderId,
                messageId: message.id
            }
        });
        await db.notification.create({
            data: {
                studentId: +receiverId,
                type: NotificationType.MESSAGE,
                title: 'New Message from Admin',
                content: 'You have received a new message from an admin.',
                actionUrl: `/student/communication?studentId=${receiverId}` // Adjust this URL as needed
            }
        });
    } else if (userType === 'STUDENT') {
        // Resolve adminId: use receiverId if it's a valid admin, otherwise use first active admin (e.g. "send to school")
        let adminId = +receiverId;
        const adminExists = await db.admin.findUnique({ where: { id: adminId } });
        if (!adminExists) {
            const firstAdmin = await db.admin.findFirst({
                where: { isActive: true },
                orderBy: { id: 'asc' }
            });
            if (!firstAdmin) throw new Error('No active admin found to receive the message');
            adminId = firstAdmin.id;
        }
        studentAdminMessage = await db.studentAdminMessage.create({
            data: {
                studentId: +senderId,
                adminId,
                messageId: message.id
            }
        });
    } else {
        throw new Error('User type must be either ADMIN or STUDENT');
    }
    const io = getIo();
    io.emit('messageStudentAdmin', {
        status: 'MessageSent',
        date: new Date()
    });
    return studentAdminMessage;
}
export async function updateMessageStatus(messageIds: string[], status: string) {
    const numMessageIds = messageIds.map((m) => Number(m));
    const message = await db.message.updateMany({
        where: {
            id: {
                in: numMessageIds
            }
        },
        data: { status: status === 'SENT' ? MessageStatus.SENT : status === 'DELIVERED' ? MessageStatus.DELIVERED : status === 'READ' ? MessageStatus.READ : MessageStatus.ERROR }
    });
    const io = getIo();
    io.emit('updateMessageStudentAdmin', {
        status: 'updateMessageSent',
        date: new Date()
    });
    return message;
}

export async function fetchMessagesForStudent(studentId: string) {
    return await db.studentAdminMessage.findMany({
        where: { studentId: +studentId },
        include: {
            message: true,
            admin: true
        }
    });
}

export async function fetchMessagesForAdmin() {
    return await db.studentAdminMessage.findMany({
        where: {
            message: {
                status: 'SENT',
                messageType: 'STUDENT'
            }
        },
        include: {
            message: true,

            student: {
                select: {
                    id: true,
                    personalDetails: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            } // Fetch details about the user involved in the message
        }
    });
}
