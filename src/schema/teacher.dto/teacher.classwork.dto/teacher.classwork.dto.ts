import { z } from 'zod';

export const createGroupClassworkSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        title: z.string().min(1, { message: 'Classworkcontent is required' }).default('Classwork'),

        ClassworkDetails: z.array(
            z.object({
                attachments: z.string(),
                description: z.string()
            })
        ),
        termSubjectLevelId: z.string().min(1, { message: 'Classworkcontent is required' }),
        sectionId: z.string().min(1, { message: 'Classworkcontent is required' }),
        className: z.string().min(1, { message: 'Classworkcontent is required' }),
        roomName: z.string().min(1, { message: 'Classworkcontent is required' }),
        classTime: z.string().min(1, { message: 'Classworkcontent is required' })

    })
});
export type CreateGroupClassworkSchema = z.infer<typeof createGroupClassworkSchema>;
