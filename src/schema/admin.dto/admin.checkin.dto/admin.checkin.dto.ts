import { z } from 'zod';

export const createSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        date: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CreateSchoolCheckInAttendanceForStudentSchema = z.infer<typeof createSchoolCheckInAttendanceForStudentSchema>;

/*fetch SchoolCheckInAttendanceForStudent*/
export const fetchSchoolCheckInAttendanceSchema = z.object({
    query: z.object({
        page: z.number().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FetchSchoolCheckInAttendanceSchema = z.infer<typeof fetchSchoolCheckInAttendanceSchema>;

/*mark check in true for a single studentid*/
export const markSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        remarks: z.string().optional()
    }),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkSchoolCheckInAttendanceForStudentSchema = z.infer<typeof markSchoolCheckInAttendanceForStudentSchema>;

/*undo checkin for a student*/
export const undoCheckInSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' })
    })
});
export type UndoCheckInSchema = z.infer<typeof undoCheckInSchema>;

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

/*undo false check in*/
export const undoFalseCheckinSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' })
    })
});

export type UndoFalseCheckinSchema = z.infer<typeof undoFalseCheckinSchema>;
export const undoSchoolCheckInAttendanceForStudentByIdSchema = z.object({
    body: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        date: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type UndoSchoolCheckInAttendanceForStudentByIdSchema = z.infer<typeof undoSchoolCheckInAttendanceForStudentByIdSchema>;
