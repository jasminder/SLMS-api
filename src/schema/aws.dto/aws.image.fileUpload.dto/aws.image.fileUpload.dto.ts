import { z } from 'zod';

const allowedFileTypes = z.enum(['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const imageUploadHomeWorkSchema = z.object({
    query: z.object({
        fileType: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type ImageUploadHomeWorkSchema = z.infer<typeof imageUploadHomeWorkSchema>;
