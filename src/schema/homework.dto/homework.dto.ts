import { z } from 'zod';

export const createHomeworkSchema = z.object({
    body: z.object({
        attachments: z.array(z.string()),
        uploadedUserRole: z.string(),
        title: z.string().default('No title'),
        description: z.string()
    }),
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
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
        termSubjectLevelIds: z.string().min(1, { message: 'At least one param string value required @ksm' }),
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindAllHomeworksBySubjectsList = z.infer<typeof findAllHomeworksBySubjectsListSchema>;

/* Find all homework records for a termsubjectlevelid and sectionid */
export const findHomeworkByTermAndSectionSchema = z.object({
    query: z.object({
        termSubjectLevelId: z.string().min(1, 'TermSubjectId is required'),
        sectionId: z.string().min(1, 'SectionId is required')
    }),
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindHomeworkByTermAndSectionSchema = z.infer<typeof findHomeworkByTermAndSectionSchema>;
