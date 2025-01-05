import { NextFunction, Request, Response } from 'express';
import {
    createSchoolCheckInAttendanceForStudent,
    fetchSchoolCheckInAttendance,
    markCheckInFalseForSelectedStudents,
    markCheckInTrueForSelectedStudents,
    markSchoolCheckInAttendanceForStudent,
    markStudentAsNotCheckedIn,
    toggleAutomatedAttendance,
    undoCheckIn,
    undoFalseCheckin,
    undoSchoolCheckInAttendanceForStudent,
    undoSchoolCheckInAttendanceForStudentById
} from '../../../service/admin.service/admin.checkin.service/admin.checkin.service';
import {
    CreateSchoolCheckInAttendanceForStudentSchema,
    MarkCheckInFalseForSelectedStudentsSchema,
    MarkCheckInTrueForSelectedStudentsSchema,
    MarkSchoolCheckInAttendanceForStudentSchema,
    MarkStudentAsNotCheckedInSchema,
    ToggleAutomatedAttendanceSchema,
    UndoCheckInSchema,
    UndoFalseCheckinSchema,
    UndoSchoolCheckInAttendanceForStudentByIdSchema
} from '../../../schema/admin.dto/admin.checkin.dto/admin.checkin.dto';

export const createSchoolCheckInAttendanceForStudentHandler = async (req: Request<{}, {}, CreateSchoolCheckInAttendanceForStudentSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { date } = req.body;

    const schoolCheckInAttendance = await createSchoolCheckInAttendanceForStudent(date);
    res.status(200).json(schoolCheckInAttendance);
};
export const undoSchoolCheckInAttendanceForStudentHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { date } = req.body;
    await undoSchoolCheckInAttendanceForStudent(date);
    res.status(200).json({ message: 'School check-in and class attendance records successfully undone for today.' });
};

export const fetchSchoolCheckInAttendanceHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const schoolCheckInAttendanceData = await fetchSchoolCheckInAttendance();
    res.status(200).json(schoolCheckInAttendanceData);
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
    } else {
        const markSchoolCheckInAttendance = await markSchoolCheckInAttendanceForStudent(studentId);
        res.status(200).json(markSchoolCheckInAttendance);
    }
};
/*undo checkin for a student*/
// admin.checkin.controller

export const undoCheckInHandler = async (req: Request<UndoCheckInSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const undoCheckInResult = await undoCheckIn(studentId);
    res.status(200).json(undoCheckInResult);
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

/*undo false check in*/
export const undoFalseCheckinHandler = async (req: Request<UndoFalseCheckinSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const updatedRecord = await undoFalseCheckin(studentId);
    res.status(200).json(updatedRecord);
};

//undo creation of school checkin and class atendance by student id and date
export const undoSchoolCheckInAttendanceForStudentByIdHandler = async (req: Request<{}, {}, UndoSchoolCheckInAttendanceForStudentByIdSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, date } = req.body;

    const updatedRecord = await undoSchoolCheckInAttendanceForStudentById(studentId, date);
    res.status(200).json(updatedRecord);
};

export const toggleAutomatedAttendanceHandler = async (req: Request<{}, {}, ToggleAutomatedAttendanceSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { termId, enabled } = req.body;
    const updatedTerm = await toggleAutomatedAttendance(termId, enabled);
    res.status(200).json(updatedTerm);
};
