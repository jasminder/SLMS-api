// schemas/emailSchema.js

import { z } from 'zod';

export const sendEmailSchema = z.object({
    body: z.object({
        recipients: z.array(z.string()),
        subject: z.string(),
        text: z.string(),
        attachmentUrl: z.string()
    })
});
export type SendEmailSchema = z.infer<typeof sendEmailSchema>;
