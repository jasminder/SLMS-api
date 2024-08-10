import { NextFunction, Request, Response } from 'express';
import {
    CreateEmailTemplateSchema,
    CreateEnrollmentConfirmationEmailTemplateSchema,
    DeleteEmailTemplateSchema,
    DeleteEnrollmentConfirmationEmailTemplateSchema,
    FetchEmailContentByDateSchema,
    UpdateEmailTemplateSchema,
    UpdateEnrollmentConfirmationEmailTemplateSchema
} from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import {
    createEmailTemplate,
    createEnrollmentConfirmationEmailTemplate,
    deleteEmailTemplate,
    deleteEnrollmentConfirmationEmailTemplate,
    fetchEmailContentByDate,
    findFirstEnrollmentConfirmationEmailTemplate,
    getAllEmailTemplates,
    updateEmailTemplate,
    updateEnrollmentConfirmationEmailTemplate
} from '../../../service/admin.service/admin.communication.service/admin.communication.service';

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
export const fetchEmailContentByDateHandler = async (req: Request<FetchEmailContentByDateSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { date } = req.params;
    const emailContents = await fetchEmailContentByDate(date);
    res.status(200).json(emailContents);
};

// sending enrollment confirmation mail

export const createEnrollmentConfirmationEmailTemplateHandler = async (
    req: Request<CreateEnrollmentConfirmationEmailTemplateSchema['params'], {}, CreateEnrollmentConfirmationEmailTemplateSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const { name, description, subject, text } = req.body;
    const { adminId } = req.params;

    const emailTemplate = await createEnrollmentConfirmationEmailTemplate(adminId, name, description, subject, text);

    res.status(201).json(emailTemplate);
};
export const updateEnrollmentConfirmationEmailTemplateHandler = async (
    req: Request<UpdateEnrollmentConfirmationEmailTemplateSchema['params'], {}, UpdateEnrollmentConfirmationEmailTemplateSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const { templateId } = req.params;
    const { name, description, subject, text } = req.body;

    const updatedTemplate = await updateEnrollmentConfirmationEmailTemplate(templateId, name, description, subject, text);

    res.status(200).json(updatedTemplate);
};

export const deleteEnrollmentConfirmationEmailTemplateHandler = async (req: Request<DeleteEnrollmentConfirmationEmailTemplateSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { templateId } = req.params;

    const result = await deleteEnrollmentConfirmationEmailTemplate(templateId);

    res.status(204).json(result);
};
export const getFirstEnrollmentConfirmationEmailTemplateHandler = async (req: Request, res: Response, next: NextFunction) => {
    const template = await findFirstEnrollmentConfirmationEmailTemplate();
    res.status(200).json(template);
};
