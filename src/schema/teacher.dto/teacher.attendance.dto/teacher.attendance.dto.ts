import { z } from 'zod';

export const fetchCheckedInStudentsWithAttendanceSchema = z.object({
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchCheckedInStudentsWithAttendanceSchema = z.infer<typeof fetchCheckedInStudentsWithAttendanceSchema>;
export const fetchSchooldayTypeSchema = z.object({
    params: z.object({
        termSubjectLevelId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchSchooldayTypeSchema = z.infer<typeof fetchSchooldayTypeSchema>;

/*mark presenttrue for a single studentid*/
export const markStudentAsPresentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        // studentClassAssignmentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        classAttendanceId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
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

/*fetch last 5 attendance for the students*/
export const getLastFiveClassAttendancesSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        studentClassAssignmentId: z.string().min(1, { message: 'Student ID is required' })
    })
});

export type GetLastFiveClassAttendancesSchema = z.infer<typeof getLastFiveClassAttendancesSchema>;

/*create automated emails record for all students in the class*/
export const createAutomatedMailForParentsSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' }),
        termSubjectLevelId: z.string().min(1, { message: 'Term Subject Level ID is required' }),
        sectionId: z.string().min(1, { message: 'Section ID is required' }),
        className: z.string().min(1, { message: 'Class name is required' }),
        roomName: z.string().min(1, { message: 'Room name is required' }),
        classTime: z.string().min(1, { message: 'Class time is required' })
    })
});

export type CreateAutomatedMailForParentsSchema = z.infer<typeof createAutomatedMailForParentsSchema>;

/*get all automated emails for parenst for students in a class*/
export const findAutomatedMailSchema = z.object({
    query: z.object({
        studentIds: z.array(z.string().min(1, { message: 'Student ID is required' })),
        termSubjectLevelId: z.string().min(1, { message: 'Term Subject Level ID is required' }),
        sectionId: z.string().min(1, { message: 'Section ID is required' }),
        teacherId: z.string().min(1, { message: 'Teacher ID is required' })
    })
});

export type FindAutomatedMailSchema = z.infer<typeof findAutomatedMailSchema>;

/*undo mark  student as present*/
export const undoMarkStudentAsPresentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        classAttendanceId: z.string().min(1, { message: 'Student ID is required' })
    })
});
export type UndoMarkStudentAsPresentSchema = z.infer<typeof undoMarkStudentAsPresentSchema>;
