import { z } from 'zod';

export const findInteractionsByStudendtIdSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindInteractionsByStudendtIdSchema = z.infer<typeof findInteractionsByStudendtIdSchema>;
