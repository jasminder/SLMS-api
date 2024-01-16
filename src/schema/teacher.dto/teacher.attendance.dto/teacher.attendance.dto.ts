import { z } from 'zod';

export const fetchCheckedInStudentsWithAttendanceSchema = z.object({
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionName: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchCheckedInStudentsWithAttendanceSchema = z.infer<typeof fetchCheckedInStudentsWithAttendanceSchema>;

/*mark presenttrue for a single studentid*/
export const markStudentAsPresentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        studentClassAssignmentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkStudentAsPresentSchema = z.infer<typeof markStudentAsPresentSchema>;

/* create student skip report*/
export const createSkipReportSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        teacherId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        reason: z.string(),
        className: z.string()
    })
});
export type CreateSkipReportSchema = z.infer<typeof createSkipReportSchema>;
