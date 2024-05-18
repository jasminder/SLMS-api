import { z } from 'zod';

export const createLeaveApplicationByStudentSchema = z.object({
    body: z.object({
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string(),
        status: z.string(),
        comments: z.string()
    }),
    params: z.object({
        studentId: z.string().min(1),
        appliedById: z.string().min(1),
        appliedByRole: z.string().min(1)
    })
});
export type CreateLeaveApplicationByStudentSchema = z.infer<typeof createLeaveApplicationByStudentSchema>;


export const fetchLeavesForStudentPortalSchema = z.object({
    params: z.object({
        studentId: z.string().min(1).transform(Number)
    })
});
export type FetchLeavesForStudentPortalSchema = z.infer<typeof fetchLeavesForStudentPortalSchema>;
