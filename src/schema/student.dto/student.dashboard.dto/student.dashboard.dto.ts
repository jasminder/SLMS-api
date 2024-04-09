import { z } from "zod";

export const findStudentsByEmailSchema = z.object({
    params: z.object({
        email: z.string().email({ message: 'Invalid email format' })
    })
});

export type FindStudentsByEmailSchema = z.infer<typeof findStudentsByEmailSchema>;
