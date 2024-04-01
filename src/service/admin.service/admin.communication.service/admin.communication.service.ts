import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

// admin.communication.service
export async function createEmailTemplate(adminId: string, name: string, subject: string, text: string) {
    const newTemplate = await db.emailTemplate.create({
        data: {
            name,
            subject,
            text,
            adminId: +adminId // Assuming adminId is passed as a string
        }
    });

    return newTemplate;
}

export async function getAllEmailTemplates() {
    return await db.emailTemplate.findMany();
}

export async function updateEmailTemplate(templateId: string, name: string, subject: string, text: string) {
    const templateToUpdate = await db.emailTemplate.findUnique({
        where: { id: +templateId }
    });

    if (!templateToUpdate) {
        throw customError('Email Template not found', 'fail', 404, true);
    }

    const updatedTemplate = await db.emailTemplate.update({
        where: { id: +templateId },
        data: {
            name,
            subject,
            text
        }
    });

    return updatedTemplate;
}
export async function deleteEmailTemplate(templateId:string) {
    const template = await db.emailTemplate.findUnique({
        where: { id: +templateId}
    });

    if (!template) {
        throw new Error('Email Template not found');
    }

    await db.emailTemplate.delete({
        where: { id: template.id }
    });
}
