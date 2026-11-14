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

/*admin creates a teacher login on a separate, school-confirmed email*/
export const createTeacherLoginSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        loginEmail: z.string().min(1, { message: 'Login email is required' }),
        confirmLoginEmail: z.string().min(1, { message: 'Please enter the login email twice' }),
        ownershipConfirmed: z.literal(true, { errorMap: () => ({ message: 'Please confirm the email belongs to this teacher' }) })
    })
});
export type CreateTeacherLoginSchema = z.infer<typeof createTeacherLoginSchema>;

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

/*Assign a class to assign teacher*/
export const assignClassToTeacherSchema = z.object({
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        subjectName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        levelName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionName: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type AssignClassToTeacherSchema = z.infer<typeof assignClassToTeacherSchema>;
/*Assign a subject to assign teacher*/
export const deleteSubjectToApprovedTeacherSchema = z.object({
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        subjectName: z.string()
    })
});

export type DeleteSubjectToApprovedTeacherSchema = z.infer<typeof deleteSubjectToApprovedTeacherSchema>;
/*delete a class to assign teacher*/
export const deleteClassToTeacherSchema = z.object({
    params: z.object({
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        subjectName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        levelName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionName: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type DeleteClassToTeacherSchema = z.infer<typeof deleteClassToTeacherSchema>;
