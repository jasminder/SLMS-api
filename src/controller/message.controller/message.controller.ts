import { NextFunction, Request, Response } from 'express';
import { fetchMessagesForAdmin, fetchMessagesForStudent, sendMessage } from '../../service/message.service/message.service';
import { CreateMessageSchema, FetchAdminMessageSchema, FetchMessageSchema } from '../../schema/message.dto/message.dto';

export const sendMessageHandler = async (req: Request<{}, {}, CreateMessageSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { content, senderId, receiverId, userType } = req.body;
    //content: string, senderId: string, receiverId: string, userType: string
    const newMessage = await sendMessage(content, senderId, receiverId, userType);
    res.status(201).json(newMessage);
};

export const getMessagesForStudentHandler = async (req: Request<FetchMessageSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const messages = await fetchMessagesForStudent(studentId);
    res.status(200).json(messages);
};
export const getMessagesForAdminHandler = async (req: Request<FetchAdminMessageSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { adminId } = req.params;
    const messages = await fetchMessagesForAdmin(adminId);
    res.status(200).json(messages);
};
