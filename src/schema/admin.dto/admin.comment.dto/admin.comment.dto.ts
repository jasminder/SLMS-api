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

export const updateCommentSchema = z.object({
    params: z.object({
        commentId: z.string().min(1, { message: 'Comment ID is required' })
    }),
    body: z.object({
        content: z.string().min(1, { message: 'Comment content is required' }),
        interactionType: z.nativeEnum(InteractionType)
    })
});
export type UpdateCommentSchema = z.infer<typeof updateCommentSchema>;
