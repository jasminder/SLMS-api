import { z } from 'zod';

export const findAllActiveStudentsWOPaginatonSchema = z.object({
    query: z.object({
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllActiveStudentsWOPaginatonSchema = z.infer<typeof findAllActiveStudentsWOPaginatonSchema>;

// search enrolled students
export const searchActiveStudentsWOPaginatonSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        subjectOption: z.string().optional(),

        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchActiveStudentsWOPaginatonSchema = z.infer<typeof searchActiveStudentsWOPaginatonSchema>;
