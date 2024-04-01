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
