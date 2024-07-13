import { z } from 'zod';

export const findAllApplicantSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});

export const searchApplicantSchema = z.object({
    query: z.object({
        search: z.string().min(1, { message: 'value required for search @ksm' }),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchApplicantSchema = z.infer<typeof searchApplicantSchema>;

export const findUniqueApplicantSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindUniqueApplicantSchema = z.infer<typeof findUniqueApplicantSchema>;

/* enroll applicant to subjects */
export const applicantEnrollDataSchema = z.object({
    body: z.object({
        applicantId: z.number(),
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
export type ApplicantEnrollDataSchema = z.infer<typeof applicantEnrollDataSchema>;
export const findUnseenApplicantSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindUnseenApplicantSchema = z.infer<typeof findUnseenApplicantSchema>;
export const findStudentToDeleteSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'A valid student ID is required' })
    })
});

export type FindStudentToDeleteSchema = z.infer<typeof findStudentToDeleteSchema>;
