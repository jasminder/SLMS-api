import { z } from 'zod';

/* create student skip report*/
export const createSkipReportByStudentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        reason: z.string()
    })
});
export type CreateSkipReportByStudentSchema = z.infer<typeof createSkipReportByStudentSchema>;
export const getSkipReportsByStudentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' })
    })
});
export type GetSkipReportsByStudentSchema = z.infer<typeof getSkipReportsByStudentSchema>;
