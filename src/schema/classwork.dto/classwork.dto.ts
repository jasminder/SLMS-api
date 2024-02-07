import { z } from 'zod';

export const createClassworkSchema = z.object({
    body: z.object({
        attachments: z.array(z.string()).optional(),
        uploadedUserRole: z.string(),
        title: z.string().default('No title'),
        description: z.string().optional().default('No Description or content')
    }),
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Subject ID required' }),
        uploaderId: z.string().min(1, { message: 'Uploader ID required' })
    })
});
export type CreateClassworkSchema = z.infer<typeof createClassworkSchema>;

export const findAllClassworksBySubjectsListSchema = z.object({
    params: z.object({
        termSubjectLevelIds: z.string().min(1, { message: 'At least one param string value required @ksm' }),
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindAllClassworksBySubjectsList = z.infer<typeof findAllClassworksBySubjectsListSchema>;
