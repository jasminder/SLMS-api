import { NextFunction, Request, Response } from 'express';
import {
    createSchoolCheckInAttendanceForStudent,
    markCheckInFalseForSelectedStudents,
    markCheckInTrueForSelectedStudents,
    markSchoolCheckInAttendanceForStudent,
    markStudentAsNotCheckedIn
} from '../../../service/admin.service/admin.checkin.service/admin.checkin.service';
import {
    CreateSchoolCheckInAttendanceForStudentSchema,

    MarkCheckInFalseForSelectedStudentsSchema,

    MarkCheckInTrueForSelectedStudentsSchema,

    MarkSchoolCheckInAttendanceForStudentSchema,
    MarkStudentAsNotCheckedInSchema
} from '../../../schema/admin.dto/admin.checkin.dto/admin.checkin.dto';

export const createSchoolCheckInAttendanceForStudentHandler = async (req: Request<{}, {}, CreateSchoolCheckInAttendanceForStudentSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { date } = req.body;
    const schoolCheckInAttendance = await createSchoolCheckInAttendanceForStudent(date);
    res.status(200).json(schoolCheckInAttendance);
};
/*mark check in true for a single studentid*/
export const markSchoolCheckInAttendanceForStudentHandler = async (
    req: Request<MarkSchoolCheckInAttendanceForStudentSchema['params'], {}, MarkSchoolCheckInAttendanceForStudentSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const remarks = req.body?.remarks;
    const { studentId } = req.params;
    if (remarks) {
        const markSchoolCheckInAttendance = await markSchoolCheckInAttendanceForStudent(studentId, remarks);
        res.status(200).json(markSchoolCheckInAttendance);
    }
};

/*mark the check-in as false for single student ID*/
export const markStudentAsNotCheckedInHandler = async (req: Request<MarkStudentAsNotCheckedInSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const studentNotCheckedIn = await markStudentAsNotCheckedIn(studentId);
    res.status(200).json(studentNotCheckedIn);
};

/*mark the check-in as true for selected student IDs*/
export const markCheckInTrueForSelectedStudentsHandler = async (req: Request<{}, {}, MarkCheckInTrueForSelectedStudentsSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds } = req.body;
    const selectedStudentsCheckedIn = await markCheckInTrueForSelectedStudents(studentIds);
    res.status(200).json(selectedStudentsCheckedIn);
};

/*mark the check-in as false for selected student IDs*/
export const markCheckInFalseForSelectedStudentsHandler = async (req: Request<{}, {}, MarkCheckInFalseForSelectedStudentsSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds } = req.body;
    const selectedStudentsCheckedIn = await markCheckInFalseForSelectedStudents(studentIds);
    res.status(200).json(selectedStudentsCheckedIn);
};