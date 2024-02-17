import { z } from 'zod';

export const createGroupClassworkSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        title: z.string().min(1, { message: 'Classworkcontent is required' }).default('Classwork'),

        classworkDetails: z.array(
            z.object({
                attachments: z.array(z.string()),
                description: z.string(),
                classworkId: z.string(),
                fileNames: z.array(z.string())
            })
        ),
        termSubjectLevelId: z.string().min(1, { message: 'Classworkcontent is required' }),
        sectionId: z.string().min(1, { message: 'Classworkcontent is required' }),
        className: z.string().min(1, { message: 'Classworkcontent is required' }),
        roomName: z.string().min(1, { message: 'Classworkcontent is required' }),
        classTime: z.string().min(1, { message: 'Classworkcontent is required' }),
        classworkIds: z.array(z.string().min(1, { message: 'Student ID is required' }))

    })
});
export type CreateGroupClassworkSchema = z.infer<typeof createGroupClassworkSchema>;


export const findAssignedClassworksSchema = z.object({
    params: z.object({
        teacherId: z.string(),
        termSubjectLevelId: z.string(),
        sectionId: z.string()
    })
});

export type FindAssignedClassworksSchema = z.infer<typeof findAssignedClassworksSchema>;