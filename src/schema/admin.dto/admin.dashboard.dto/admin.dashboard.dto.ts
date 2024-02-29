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
