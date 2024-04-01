import { z } from 'zod';

//admin.communication.dto
export const createEmailTemplateSchema = z.object({
    params: z.object({
        adminId: z.string().min(1, { message: 'Admin ID is required' })
    }),
    body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        subject: z.string().min(1, { message: 'Subject is required' }),
        text: z.string().min(1, { message: 'Text is required' })
    })
});

export type CreateEmailTemplateSchema = z.infer<typeof createEmailTemplateSchema>;
