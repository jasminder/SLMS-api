import { z } from 'zod';




export const createSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        date: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CreateSchoolCheckInAttendanceForStudentSchema = z.infer<typeof createSchoolCheckInAttendanceForStudentSchema>;

/*mark check in true for a single studentid*/
export const markSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z
        .object({
            remarks: z.string()
        })
        .optional(),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkSchoolCheckInAttendanceForStudentSchema = z.infer<typeof markSchoolCheckInAttendanceForStudentSchema>;

/*mark check in false for a single studentid*/
export const markStudentAsNotCheckedInSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkStudentAsNotCheckedInSchema = z.infer<typeof markStudentAsNotCheckedInSchema>;

/*mark the check-in as true for selected student IDs*/
export const markCheckInTrueForSelectedStudentsSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string())
    })
});
export type MarkCheckInTrueForSelectedStudentsSchema = z.infer<typeof markCheckInTrueForSelectedStudentsSchema>;

/*mark the check-in as false for selected student IDs*/
export const markCheckInFalseForSelectedStudentsSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string())
    })
});
export type MarkCheckInFalseForSelectedStudentsSchema = z.infer<typeof markCheckInFalseForSelectedStudentsSchema>;
