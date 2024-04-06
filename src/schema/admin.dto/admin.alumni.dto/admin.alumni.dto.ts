import { z } from 'zod';

export const findAllAlumniSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindAllAlumniSchema = z.infer<typeof findAllAlumniSchema>;

export const searchAlumniSchema = z.object({
    query: z.object({
        search: z.string().min(1, { message: 'value required for search @ksm' }),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchAlumniSchema = z.infer<typeof searchAlumniSchema>;
export const makeAlumniToActiveByIdSchema = z.object({
    params: z.object({
        alumniId: z.string().regex(/^\d+$/, { message: 'Invalid student ID format' })
    })
});

export type MakeAlumniToActiveByIdSchema = z.infer<typeof makeAlumniToActiveByIdSchema>;
export const findUniqueAlumniSchema = z.object({
    params: z.object({
        alumniId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindUniqueAlumniSchema = z.infer<typeof findUniqueAlumniSchema>;
/* enroll enrolledStudent to subjects */
export const alumniEnrollDataSchema = z.object({
    body: z.object({
        alumniId: z.number(),
        enrollData: z.array(
            z.object({
                subject: z.string(),
                termSubjectGroupId: z.number(),
                subjectGroupId: z.number(),
                termId: z.number(),
                feeId: z.number(),
                termSubjectId: z.number()
            })
        )
    })
});
export type AlumniEnrollDataSchema = z.infer<typeof alumniEnrollDataSchema>;

export const findAlumniSubjectsSchema = z.object({
    params: z.object({
        alumniId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindAlumniSubjectsSchema = z.infer<typeof findAlumniSubjectsSchema>;