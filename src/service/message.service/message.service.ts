import { MessageType } from '@prisma/client';
import { db } from '../../utils/db.server';

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

    return studentAdminMessage;
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
