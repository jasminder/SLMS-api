import { MessageStatus, MessageType } from '@prisma/client';
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
    } else if (userType === 'STUDENT') {
        studentAdminMessage = await db.studentAdminMessage.create({
            data: {
                studentId: +senderId,
                adminId: +receiverId,
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

export async function fetchMessagesForAdmin(adminId: string) {
    return await db.studentAdminMessage.findMany({
        where: { adminId: +adminId },
        include: {
            message: true, // Fetch the details of the message
            student: true // Fetch details about the user involved in the message
        }
    });
}
