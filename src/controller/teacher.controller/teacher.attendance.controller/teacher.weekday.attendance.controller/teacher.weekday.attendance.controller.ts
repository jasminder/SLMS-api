import { NextFunction, Request, Response } from 'express';
import { MarkWeekdayStudentAsPresentSchema, UndoWeekdayStudentAsPresentSchema } from '../../../../schema/teacher.dto/teacher.attendance.dto/teacher.weekday.attendance.dto/teacher.weekday.attendance.dto';
import { markWeekdayStudentAsPresent, undoMarkWeekdayStudentAsPresent } from '../../../../service/teacher.service/teacher.attendance.service/teacher.weekday.attendance.service/teacher.weekday.attendance.service';

/*mark check in true for a single studentid*/
export const markWeekdayStudentAsPresentHandler = async (
    req: Request<MarkWeekdayStudentAsPresentSchema['params'], {}, MarkWeekdayStudentAsPresentSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const remarks = req.body?.remarks;
    const { studentId, studentClassAssignmentId } = req.params;
    if (remarks) {
        const markWeekdaySchoolCheckInAttendance = await markWeekdayStudentAsPresent(studentId, studentClassAssignmentId, remarks);
        res.status(200).json(markWeekdaySchoolCheckInAttendance);
    } else {
        const markWeekdaySchoolCheckInAttendance = await markWeekdayStudentAsPresent(studentId, studentClassAssignmentId);
        res.status(200).json(markWeekdaySchoolCheckInAttendance);
    }
};

export const undoMarkWeekdayStudentAsPresentHandler = async (req: Request<UndoWeekdayStudentAsPresentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId , studentClassAssignmentId} = req.params;
    const undoMarkWeekdayStudentAsPresentResult = await undoMarkWeekdayStudentAsPresent(studentId,studentClassAssignmentId);
    res.status(200).json(undoMarkWeekdayStudentAsPresentResult);
};