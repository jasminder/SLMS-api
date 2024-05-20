
import { z } from 'zod';

export const fetchStudentHomeworkSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' }),
        termSubjectLevelId: z.string().min(1, { message: 'Term Subject Level ID is required' }),
        sectionId: z.string().min(1, { message: 'Section ID is required' })
    })
});
export type FetchStudentHomeworkSchema = z.infer<typeof fetchStudentHomeworkSchema>;
