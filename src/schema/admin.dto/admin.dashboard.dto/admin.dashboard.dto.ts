import { z } from 'zod';

export const fetchActiveCheckedInStudentsSchema = z.object({
    query: z.object({
        dateString: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchActiveCheckedInStudentsSchema = z.infer<typeof fetchActiveCheckedInStudentsSchema>;
export const fetchCheckedOutStudentsSchema = z.object({
    query: z.object({
        dateString: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchCheckedOutStudentsSchema = z.infer<typeof fetchCheckedOutStudentsSchema>;
export const fetchStudentsOnLeaveSchema = z.object({
    query: z.object({
        dateString: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchStudentsOnLeaveSchema = z.infer<typeof fetchStudentsOnLeaveSchema>;
export const fetchStudentsOnAbsentSchema = z.object({
    query: z.object({
        dateString: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchStudentsOnAbsentSchema = z.infer<typeof fetchStudentsOnAbsentSchema>;
export const fetchStudentsOnAttendanceSchema = z.object({
    query: z.object({
        dateString: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchStudentsOnAttendanceSchema = z.infer<typeof fetchStudentsOnAttendanceSchema>;
//To find all active students for Admin
export const findAllActiveStudentsWithFlagsSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllActiveStudentsWithFlagsSchema = z.infer<typeof findAllActiveStudentsWithFlagsSchema>;

// search active students
export const searchActiveStudentsWithFlagsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        subjectOption: z.string().optional(),
        levelOption: z.string().optional(),
        sectionOption: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchActiveStudentsWithFlagsSchema = z.infer<typeof searchActiveStudentsWithFlagsSchema>;
