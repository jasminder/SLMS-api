import { InteractionType } from '@prisma/client';
import { z } from 'zod';

export const createCommentsSchema = z.object({
    body: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        adminId: z.string().min(1, { message: 'Admin ID is required' }),
        content: z.string().min(1, { message: 'Comment content is required' }),
        interactionType: z.nativeEnum(InteractionType)
    })
});

export type CreateCommentsSchema = z.infer<typeof createCommentsSchema>;



export const findCommentsByStudendtIdSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindCommentsByStudendtIdSchema = z.infer<typeof findCommentsByStudendtIdSchema>;
