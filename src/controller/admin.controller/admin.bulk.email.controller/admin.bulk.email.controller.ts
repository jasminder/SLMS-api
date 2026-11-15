import { Request, Response } from 'express';
import { getBulkEmail, listBulkEmails, previewBulkEmail, sendTestBulkEmail, startBulkEmail } from '../../../service/bulk.email.service/bulk.email.service';
import { customError } from '../../../utils/customError';

/* Scope of Work item 35: email to a selected group of students. ADMIN only (enforced on the route). */
export const previewBulkEmailHandler = async (req: Request, res: Response) => {
    const { studentIds, mode } = req.body ?? {};
    res.status(200).json(await previewBulkEmail({ studentIds, mode }));
};

export const sendBulkEmailHandler = async (req: Request, res: Response) => {
    const { studentIds, mode, subject, message, templateId, templateName, filters } = req.body ?? {};
    const admin = { id: req.user?.id, email: req.user?.email ?? 'unknown' };
    const started = await startBulkEmail({ studentIds, mode, subject, message, templateId, templateName, filters }, admin);
    res.status(202).json({ id: started.id, recipientCount: started.recipientCount, skippedStudents: started.skippedStudents });
};

export const listBulkEmailsHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listBulkEmails());
};

export const getBulkEmailHandler = async (req: Request<{ id: string }>, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw customError('The sent email id is not valid.', 'fail', 400, true);
    res.status(200).json(await getBulkEmail(id));
};

/* A single test copy to the signed-in admin's own address. Nobody else is emailed and nothing is recorded as a group send. */
export const sendTestBulkEmailHandler = async (req: Request, res: Response) => {
    const { studentIds, subject, message } = req.body ?? {};
    res.status(200).json(await sendTestBulkEmail({ studentIds, subject, message }, req.user?.email ?? ''));
};
