import { z } from 'zod';

export const findStudentsByEmailSchema = z.object({
    params: z.object({
        email: z.string().email({ message: 'Invalid email format' })
    })
});

export type FindStudentsByEmailSchema = z.infer<typeof findStudentsByEmailSchema>;

export const findActiveStudentDetailsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindActiveStudentDetailsSchema = z.infer<typeof findActiveStudentDetailsSchema>;
