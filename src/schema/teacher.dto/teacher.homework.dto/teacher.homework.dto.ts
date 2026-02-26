import { z } from 'zod';

const isoDateStringSchema = z.string().refine(
    (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
    },
    { message: 'Invalid date format. Use YYYY-MM-DD or ISO date string.' }
);

export const createGroupHomeworkSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        title: z.string().min(1, { message: 'homeworkcontent is required' }).default('Homework'),

        homeworkDetails: z.array(
            z.object({
                attachments: z.array(z.string()),
                description: z.string(),
                homeworkId: z.string(),
                fileNames: z.array(z.string())
            })
        ),
        termSubjectLevelId: z.string().min(1, { message: 'homeworkcontent is required' }),
        sectionId: z.string().min(1, { message: 'homeworkcontent is required' }),
        className: z.string().min(1, { message: 'homeworkcontent is required' }),
        roomName: z.string().min(1, { message: 'homeworkcontent is required' }),
        classTime: z.string().min(1, { message: 'homeworkcontent is required' }),
        homeworkIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        sendDate: isoDateStringSchema.optional()
    })
});
export type CreateGroupHomeworkSchema = z.infer<typeof createGroupHomeworkSchema>;

// teacher.homework.dto.js

export const findAssignedHomeworksSchema = z.object({
    params: z.object({
        teacherId: z.string(),
        termSubjectLevelId: z.string(),
        sectionId: z.string()
    })
});

export type FindAssignedHomeworksSchema = z.infer<typeof findAssignedHomeworksSchema>;
