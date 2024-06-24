import { z } from 'zod';

/* enroll applicant to subjects */
export const createClassWithSectionsSchema = z.object({
    body: z.object({
        createClassData: z.object({
            termId: z.number(),
            subjectName: z.string(),
            levelName: z.string(),
            sections: z.array(z.string())
        })
    })
});
export type CreateClassWithSectionsSchema = z.infer<typeof createClassWithSectionsSchema>;

export const fetchStudentCountInClassSchema = z.object({
    query: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'termSubjectLevelId is required' }),
        sectionId: z.string().min(1, { message: 'sectionId is required' })
    })
});

export type FetchStudentCountInClass = z.infer<typeof fetchStudentCountInClassSchema>;
