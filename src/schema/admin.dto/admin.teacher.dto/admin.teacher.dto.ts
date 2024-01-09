import { z } from 'zod';

/*search teachers*/
export const searchTeachersSchema = z.object({
    query: z.object({
        search: z.string().min(1, { message: 'value required for search @ksm' })
    })
});
export type SearchTeachersSchema = z.infer<typeof searchTeachersSchema>;
/*find appicant by id*/
export const findUniqueTeacherSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindUniqueTeacherSchema = z.infer<typeof findUniqueTeacherSchema>;

/*Assign a subject to assign teacher*/
export const assignSubjectToApprovedTeacherSchema = z.object({
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        subjectName: z.string()
    })
});

export type AssignSubjectToApprovedTeacherSchema = z.infer<typeof assignSubjectToApprovedTeacherSchema>;
