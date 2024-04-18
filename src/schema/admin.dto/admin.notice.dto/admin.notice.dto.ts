import { z } from 'zod';

export const createNoticeSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().min(1, 'Content is required'),
        teacherIds: z.array(z.string().min(1, 'Content is required'))
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

export const getNoticeSchema = z.object({
    params: z.object({
        noticeId: z.string().min(1, { message: 'Notice ID is required' }).regex(/^\d+$/, 'Notice ID must be a number')
    })
});

export type GetNoticeSchema = z.infer<typeof getNoticeSchema>;

export const updateNoticeSchema = z.object({
    params: z.object({
        noticeId: z.string().min(1, { message: 'Notice ID is required' }).regex(/^\d+$/, 'Notice ID must be a number')
    }),
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().min(1, 'Content is required')
    })
});

export type UpdateNoticeSchema = z.infer<typeof updateNoticeSchema>;

export const resetNoticeViewsSchema = z.object({
    params: z.object({
        noticeId: z.string().min(1, { message: 'Notice ID is required' }).regex(/^\d+$/, 'Notice ID must be a number')
    })
});

export type ResetNoticeViewsSchema = z.infer<typeof resetNoticeViewsSchema>;

export const acknowledgeNoticeSchema = z.object({
    params: z.object({
        noticeId: z.string(),
        teacherId: z.string()
    })
});

export type AcknowledgeNoticeSchema = z.infer<typeof acknowledgeNoticeSchema>;

export const getStudentportalNoticesSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Teacher ID is required' }).regex(/^\d+$/, 'Teacher ID must be a number')
    })
});

export type GetStudentportalNoticesSchema = z.infer<typeof getStudentportalNoticesSchema>;
