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

export const getStudentNoticeSchema = z.object({
    params: z.object({
        noticeId: z.string().min(1, { message: 'Notice ID is required' }).regex(/^\d+$/, 'Notice ID must be a number')
    })
});

export type GetStudentNoticeSchema = z.infer<typeof getStudentNoticeSchema>;

export const getStudentportalNoticesSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Teacher ID is required' }).regex(/^\d+$/, 'Teacher ID must be a number')
    })
});

export type GetStudentportalNoticesSchema = z.infer<typeof getStudentportalNoticesSchema>;
