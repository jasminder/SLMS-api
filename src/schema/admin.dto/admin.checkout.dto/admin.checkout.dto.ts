import { z } from 'zod';

/*mark check in true for a single studentid*/
export const markStudentAsCheckedOutchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkStudentAsCheckedOutSchema = z.infer<typeof markStudentAsCheckedOutchema>;


// Function to mark multiple students as checked out in SchoolCheckInAttendance records
export const markSelectedStudentsAsCheckedOutSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string())
    })
});
export type MarkSelectedStudentsAsCheckedOutSchema = z.infer<typeof markSelectedStudentsAsCheckedOutSchema>;
