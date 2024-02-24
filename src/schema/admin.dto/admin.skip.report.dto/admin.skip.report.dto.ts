import { z } from 'zod';

export const getSkipReportsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' })
    })
});

export type GetSkipReportsSchema = z.infer<typeof getSkipReportsSchema>;

/* create student skip report*/
export const createSkipReportSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        adminId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        reason: z.string(),
        className: z.string()
    })
});
export type CreateSkipReportSchema = z.infer<typeof createSkipReportSchema>;

export const updateSkipReportReasonSchema = z.object({
    params: z.object({
        skipReportId: z.string().min(1, { message: 'Student ID is required' })
    }),
    body: z.object({
        reason: z.string().min(1, { message: 'Reason for update is required' })
    })
});

export type UpdateSkipReportReasonSchema = z.infer<typeof updateSkipReportReasonSchema>;

export const closeSkipReportSchema = z.object({
    params: z.object({
        skipReportId: z.string().min(1, { message: 'Skip Report ID is required' })
    }),
    body: z.object({
        reason: z.string().min(1, { message: 'Reason for update is required' }),
        adminClosingRemarks: z.string().min(1, { message: 'Admin closing remarks are required' })
    })
});

export type CloseSkipReportSchema = z.infer<typeof closeSkipReportSchema>;
