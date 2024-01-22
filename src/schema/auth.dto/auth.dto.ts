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

export type LoginUserSchema = z.infer<typeof loginUserSchema>;

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string()
    })
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    body: z.object({
        password: z.string(),
        confirmPassword: z.string()
    }),
    params: z.object({
        token: z.string()
    })
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
