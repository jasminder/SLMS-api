import { z } from 'zod';

export const createFeedbackSchema = z.object({
    body: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        content: z.string().min(1, { message: 'Feedback content is required' }),
        title: z.string().min(1, { message: 'Feedback content is required' }),
        termSubjectLevelId:z.string().min(1, { message: 'Feedback content is required' }),
        sectionId:  z.string().min(1, { message: 'Feedback content is required' }),
        className:  z.string().min(1, { message: 'Feedback content is required' }),
        roomName:  z.string().min(1, { message: 'Feedback content is required' }),
    })
});
export type CreateFeedbackSchema = z.infer<typeof createFeedbackSchema>;
