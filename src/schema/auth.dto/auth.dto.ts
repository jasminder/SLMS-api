import { z } from 'zod';

export const signupUserSchema = z.object({
    body: z.object({
        email: z.string(),
        password: z.string(),
        confirmPassword: z.string()
    })
});

export type SignupUserSchema = z.infer<typeof signupUserSchema>;

export const loginUserSchema = z.object({
    body: z.object({
        email: z.string(),
        password: z.string()
    })
});

export type LoginUserUserSchema = z.infer<typeof loginUserSchema>;
