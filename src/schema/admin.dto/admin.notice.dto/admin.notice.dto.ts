import { z } from 'zod';

export const createNoticeSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().min(1, 'Content is required')
    }),
    params: z.object({
        adminId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type CreateNoticeSchema = z.infer<typeof createNoticeSchema>;

export const deleteNoticeSchema = z.object({
    params: z.object({
        noticeId: z.string().min(1, { message: 'Notice ID is required' })
    })
});

export type DeleteNoticeSchema = z.infer<typeof deleteNoticeSchema>;



export const getUnseenNoticesSchema = z.object({
    params: z.object({
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }).regex(/^\d+$/, 'Teacher ID must be a number')
    })
});

export type GetUnseenNoticesSchema = z.infer<typeof getUnseenNoticesSchema>;
