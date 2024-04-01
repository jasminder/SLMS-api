import { NextFunction, Request, Response } from 'express';
import { CreateEmailTemplateSchema } from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import { createEmailTemplate } from '../../../service/admin.service/admin.communication.service/admin.communication.service';

export const createEmailTemplateHandler = async (req: Request<CreateEmailTemplateSchema['params'], {}, CreateEmailTemplateSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { name, subject, text } = req.body;
    const { adminId } = req.params;
    const emailTemplate = await createEmailTemplate(adminId, name, subject, text);
    res.status(201).json({
        status: 'success',
        data: { emailTemplate }
    });
};
