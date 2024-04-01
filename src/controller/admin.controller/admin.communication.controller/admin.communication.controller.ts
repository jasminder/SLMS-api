import { NextFunction, Request, Response } from 'express';
import { CreateEmailTemplateSchema, DeleteEmailTemplateSchema, UpdateEmailTemplateSchema } from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import { createEmailTemplate, deleteEmailTemplate, getAllEmailTemplates, updateEmailTemplate } from '../../../service/admin.service/admin.communication.service/admin.communication.service';

export const createEmailTemplateHandler = async (req: Request<CreateEmailTemplateSchema['params'], {}, CreateEmailTemplateSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { name, subject, text } = req.body;
    const { adminId } = req.params;
    const emailTemplate = await createEmailTemplate(adminId, name, subject, text);
    res.status(201).json({
        status: 'success',
        data: { emailTemplate }
    });
};
export const getAllEmailTemplatesHandler = async (req: Request, res: Response, next: NextFunction) => {
    const emailTemplates = await getAllEmailTemplates();
    res.status(200).json(emailTemplates);
};

export const updateEmailTemplateHandler = async (req: Request<UpdateEmailTemplateSchema['params'], {}, UpdateEmailTemplateSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { templateId } = req.params;
    const { name, subject, text } = req.body;

    const updatedTemplate = await updateEmailTemplate(templateId, name, subject, text);
    res.status(200).json({
        status: 'success',
        data: { updatedTemplate }
    });
};

export const deleteEmailTemplateHandler = async (req: Request<DeleteEmailTemplateSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { templateId } = req.params;
    await deleteEmailTemplate(templateId);
    res.status(204).json({
        status: 'success',
        data: null // No content to send back
    });
};
