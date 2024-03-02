import { z } from "zod";

export const activeStudentsPerSubjectSchema = z.object({
    query: z.object({
        termId: z.string()
    })
});
export type ActiveStudentsPerSubjectSchema = z.infer<typeof activeStudentsPerSubjectSchema>;