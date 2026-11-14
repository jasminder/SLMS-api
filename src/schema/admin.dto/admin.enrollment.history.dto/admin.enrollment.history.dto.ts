import { z } from 'zod';

/* Read-only: subjects a student has left, and the class attendance that was kept for them. */
export const studentEnrollmentHistorySchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, { message: 'Student id must be a number' })
    }),
    query: z.object({
        termId: z.string().regex(/^\d+$/, { message: 'termId must be a number' }).optional()
    })
});
export type StudentEnrollmentHistorySchema = z.infer<typeof studentEnrollmentHistorySchema>;
