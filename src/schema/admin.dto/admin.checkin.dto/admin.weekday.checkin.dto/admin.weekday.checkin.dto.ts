
import { z } from 'zod';

export const createWeekdaySchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        date: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CreateWeekdaySchoolCheckInAttendanceForStudentSchema = z.infer<typeof createWeekdaySchoolCheckInAttendanceForStudentSchema>;
