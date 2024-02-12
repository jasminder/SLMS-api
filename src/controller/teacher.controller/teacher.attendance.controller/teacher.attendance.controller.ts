import { NextFunction, Request, Response } from 'express';
import {
    createAutomatedMailForParents,
    createSkipReport,
    fetchCheckedInStudentsWithAttendance,
    findAutomatedMail,
    getLastFiveClassAttendances,
    markStudentAsPresent
} from '../../../service/teacher.service/teacher.attendance.service/teacher.attendance.service';
import {
    CreateAutomatedMailForParentsSchema,
    CreateSkipReportSchema,
    FetchCheckedInStudentsWithAttendanceSchema,
    FindAutomatedMailSchema,
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
    const { studentId, studentClassAssignmentId } = req.params;
    const attendances = await getLastFiveClassAttendances(studentId, studentClassAssignmentId);
    res.status(200).json(attendances);
};

/*create automated emails record for all students in the class*/
export const createAutomatedMailForparentsHandler = async (req: Request<{}, {}, CreateAutomatedMailForParentsSchema['body'], {}>, res: Response) => {
    const { studentIds, teacherId, termSubjectLevelId, sectionId, className, roomName, classTime } = req.body;
    const mails = await createAutomatedMailForParents(studentIds, teacherId, termSubjectLevelId, sectionId, className, roomName, classTime);
    res.status(201).json(mails);
};

/*get all automated emails for parenst for students in a class*/
export const findAutomatedMailHandler = async (req: Request<{}, {}, {}, FindAutomatedMailSchema['query']>, res: Response, next: NextFunction) => {
    const { studentIds, termSubjectLevelId, sectionId, teacherId } = req.query;
    const mails = await findAutomatedMail(studentIds, termSubjectLevelId, sectionId, teacherId);
    res.status(200).json(mails);
};
