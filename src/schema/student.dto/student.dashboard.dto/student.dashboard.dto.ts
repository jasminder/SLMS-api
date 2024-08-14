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
export const acknowledgeStudentNoticeSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }).regex(/^\d+$/, 'Student ID must be a number'),
        studentNoticeId: z.string().min(1, { message: 'Notice ID is required' }).regex(/^\d+$/, 'Notice ID must be a number')
    })
});

export type AcknowledgeStudentNoticeSchema = z.infer<typeof acknowledgeStudentNoticeSchema>;

export const fetchStudentAssignmentsSchema = z.object({
    params: z.object({
        studentId: z.string()
    })
});
export type FetchStudentAssignmentsSchema = z.infer<typeof fetchStudentAssignmentsSchema>;

export const teacherAssignmentSchema = z.object({
    params: z.object({
        termSubjectLevelId: z.string(),
        sectionId: z.string()
    })
});
export type TeacherAssignmentSchema = z.infer<typeof teacherAssignmentSchema>;

export const getStudentNotificationsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }).regex(/^\d+$/, 'Student ID must be a number')
    }),
    query: z.object({
        limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
        offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional()
    })
});

export type GetStudentNotificationsSchema = z.infer<typeof getStudentNotificationsSchema>;
