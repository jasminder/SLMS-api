import { z } from 'zod';

const allowedFileTypes = z.enum(['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export const fileDownloadHomeWorkSchema = z.object({
    query: z.object({
        fileUrl: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FileDownloadHomeWorkSchema = z.infer<typeof fileDownloadHomeWorkSchema>;
