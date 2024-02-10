import { NextFunction, Request, Response } from 'express';
import {
    createSkipReport,
    fetchCheckedInStudentsWithAttendance,
    getLastFiveClassAttendances,
    markStudentAsPresent
} from '../../../service/teacher.service/teacher.attendance.service/teacher.attendance.service';
import {
    CreateSkipReportSchema,
    FetchCheckedInStudentsWithAttendanceSchema,
    GetLastFiveClassAttendancesSchema,
    MarkStudentAsPresentSchema
} from '../../../schema/teacher.dto/teacher.attendance.dto/teacher.attendance.dto';

/* fetching the check-in record for students who have checked in with default class-attendance */
export const fetchCheckedInStudentsWithAttendanceHandler = async (req: Request<FetchCheckedInStudentsWithAttendanceSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { termSubjectLevelId, sectionName } = req.params;
    const markSchoolCheckInAttendance = await fetchCheckedInStudentsWithAttendance(termSubjectLevelId, sectionName);
    res.status(200).json(markSchoolCheckInAttendance);
};

/*mark presenttrue for a single studentid*/
export const markStudentAsPresentHandler = async (req: Request<MarkStudentAsPresentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentClassAssignmentId, studentId } = req.params;
    const markSchoolCheckInAttendance = await markStudentAsPresent(studentId, studentClassAssignmentId);
    res.status(200).json(markSchoolCheckInAttendance);
};
/* create student skip report*/
export const createSkipReportHandler = async (req: Request<CreateSkipReportSchema['params'], {}, CreateSkipReportSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { teacherId, studentId } = req.params;
    const { reason, className } = req.body;

    const SkipReport = await createSkipReport(studentId, teacherId, reason, className);
    res.status(200).json(SkipReport);
};

/*fetch last 5 attendance for the students*/
export const getLastFiveClassAttendancesHandler = async (req: Request<GetLastFiveClassAttendancesSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const attendances = await getLastFiveClassAttendances(studentId);
    res.status(200).json(attendances);
};
