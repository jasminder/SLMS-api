import { NextFunction, Request, Response } from 'express';
import { createNotice, deleteNotice, getAllNotices, getUnseenNotices } from '../../../service/admin.service/admin.notice.service/admin.notice.service';
import { CreateNoticeSchema, DeleteNoticeSchema, GetUnseenNoticesSchema } from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';

export const createNoticeHandler = async (req: Request<CreateNoticeSchema['params'], {}, CreateNoticeSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { title, content } = req.body;
    const { adminId } = req.params; // Assuming admin ID is in the request user object
    const notice = await createNotice(adminId, title, content);
    res.status(201).json({ message: 'Notice created successfully', notice });
};

export const getAllNoticesHandler = async (req: Request, res: Response, next: NextFunction) => {
    const notices = await getAllNotices();
    res.status(200).json(notices);
};

export const deleteNoticeHandler = async (req: Request<DeleteNoticeSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    await deleteNotice(noticeId);
    res.status(200).json({ message: 'Notice deleted successfully' });
};

export const getUnseenNoticesHandler = async (req: Request<GetUnseenNoticesSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { teacherId } = req.params;
    const notices = await getUnseenNotices(teacherId);
    res.status(200).json(notices);
};
