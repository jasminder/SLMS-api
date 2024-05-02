// schema/feeTemplateSchema.js
import { z } from 'zod';

export const feeTemplateSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string()),
        interval: z.string(),
        notes: z.string(),
        month: z.string(),
        year: z.string(),
        termName: z.string(),
        termId: z.string(),
        termSubjectGroupName: z.string(),
        termSubjectGroupId: z.string(),
        dueDate: z.string(),
        amount: z.string()
    })
});
export type FeeTemplateDataSchema = z.infer<typeof feeTemplateSchema>;
