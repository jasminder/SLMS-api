import { z } from 'zod';

/*find appicant by id*/
export const findTeacherByIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindTeacherByIdSchema = z.infer<typeof findTeacherByIdSchema>;

/*Find all students in a class for teacher*/
export const fetchStudentsInSameClassSchema = z.object({
    query: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionName: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchStudentsInSameClass = z.infer<typeof fetchStudentsInSameClassSchema>;
