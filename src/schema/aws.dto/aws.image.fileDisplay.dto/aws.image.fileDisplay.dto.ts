import { z } from 'zod';

const allowedFileTypes = z.enum(['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const fileDisplayImageSchema = z.object({
    query: z.object({
        fileUrl: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FileDisplayImageSchema = z.infer<typeof fileDisplayImageSchema>;
