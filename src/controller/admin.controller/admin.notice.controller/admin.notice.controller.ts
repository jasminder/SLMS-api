import { NextFunction, Request, Response } from 'express';
import { createNotice, deleteNotice, getAllNotices, getNotice, getUnseenNotices, resetNoticeViews, updateNotice } from '../../../service/admin.service/admin.notice.service/admin.notice.service';
import {
    CreateNoticeSchema,
    DeleteNoticeSchema,
    GetNoticeSchema,
    GetUnseenNoticesSchema,
    ResetNoticeViewsSchema,
    UpdateNoticeSchema
} from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';

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

export const getNoticeHandler = async (req: Request<GetNoticeSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    const notice = await getNotice(noticeId);
    if (notice) {
        res.status(200).json(notice);
    } else {
        res.status(404).json({ message: 'Notice not found' });
    }
};

export const updateNoticeHandler = async (req: Request<UpdateNoticeSchema['params'], {}, UpdateNoticeSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    const { title, content } = req.body;
    const updatedNotice = await updateNotice(noticeId, title, content);
    if (!updatedNotice) {
        return res.status(404).json({ message: 'Notice not found' });
    }
    res.status(200).json({ message: 'Notice updated successfully', updatedNotice });
};
export const resetNoticeViewsHandler = async (req: Request<ResetNoticeViewsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    await resetNoticeViews(noticeId);
    res.status(200).json({ message: 'Notice views reset successfully' });
};
