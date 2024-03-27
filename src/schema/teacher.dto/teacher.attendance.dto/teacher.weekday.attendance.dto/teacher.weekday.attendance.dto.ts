//teacher.weekday.attendance.dto

import { z } from 'zod';

/*mark check in true for a single studentid*/
export const markWeekdayStudentAsPresentSchema = z.object({
    body: z.object({
        remarks: z.string().optional()
    }),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        studentClassAssignmentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkWeekdayStudentAsPresentSchema = z.infer<typeof markWeekdayStudentAsPresentSchema>;

export const undoWeekdayStudentAsPresentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        studentClassAssignmentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UndoWeekdayStudentAsPresentSchema = z.infer<typeof undoWeekdayStudentAsPresentSchema>;
