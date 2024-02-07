import { z } from 'zod';

export const createGroupHomeworkSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        title: z.string().min(1, { message: 'homeworkcontent is required' }).default('Homework'),

        homeworkDetails: z.array(
            z.object({
                attachments: z.string(),
                description: z.string()
            })
        ),
        termSubjectLevelId: z.string().min(1, { message: 'homeworkcontent is required' }),
        sectionId: z.string().min(1, { message: 'homeworkcontent is required' }),
        className: z.string().min(1, { message: 'homeworkcontent is required' }),
        roomName: z.string().min(1, { message: 'homeworkcontent is required' }),
        classTime: z.string().min(1, { message: 'homeworkcontent is required' })

    })
});
export type CreateGroupHomeworkSchema = z.infer<typeof createGroupHomeworkSchema>;
