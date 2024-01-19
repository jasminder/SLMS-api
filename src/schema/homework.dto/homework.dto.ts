import { z } from 'zod';

export const createHomeworkSchema = z.object({
    body: z.object({
        attachments: z.array(z.string()),
        uploadedUserRole: z.string(),
        title: z.string(),
        description: z.string()
    }),
    params: z.object({
        subjectId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        uploaderId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CreateHomeworkSchema = z.infer<typeof createHomeworkSchema>;

export const findHomeworkByIdSchema = z.object({
    params: z.object({
        homeworkId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindHomeworkByIdSchema = z.infer<typeof findHomeworkByIdSchema>;



export const findAllHomeworksBySubjectsListSchema = z.object({
    params: z.object({
        subjectIds: z.string().min(1, { message: 'At least one param string value required @ksm' })
    })
});

export type FindAllHomeworksBySubjectsList = z.infer<typeof findAllHomeworksBySubjectsListSchema>;
