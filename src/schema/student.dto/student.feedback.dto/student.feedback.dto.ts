import { z } from 'zod';

// Define a ForStudentschema for validating the URL parameters
export const getFeedbackForStudentSchema = z.object({
    params: z.object({
        studentId: z.string(),
        termSubjectLevelId: z.string()
    })
});

export type GetFeedbackForStudentSchema = z.infer<typeof getFeedbackForStudentSchema>;
