import { z } from 'zod';

const allowedFileTypes = z.enum(['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const fileUploadHomeWorkSchema = z.object({
    query: z.object({
        fileName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        fileType: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FileUploadHomeWorkSchema = z.infer<typeof fileUploadHomeWorkSchema>;
