import { z } from 'zod';

export const createGroupHomeworkSchema = z.object({
    body: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        title: z.string().min(1, { message: 'homeworkcontent is required' }),
        attachments: z.array(z.string().min(1, { message: 'homeworkcontent is required' })),
        termSubjectLevelId: z.string().min(1, { message: 'homeworkcontent is required' }),
        sectionId: z.string().min(1, { message: 'homeworkcontent is required' }),
        className: z.string().min(1, { message: 'homeworkcontent is required' }),
        roomName: z.string().min(1, { message: 'homeworkcontent is required' }),
        description  : z.string().min(1, { message: 'homeworkcontent is required' }),
    })
});
export type CreateGroupHomeworkSchema = z.infer<typeof createGroupHomeworkSchema>;
