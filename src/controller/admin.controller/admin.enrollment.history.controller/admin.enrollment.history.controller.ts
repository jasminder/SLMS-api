import { NextFunction, Request, Response } from 'express';
import { findArchivedClassAttendance, findStudentEnrollmentHistory } from '../../../service/admin.service/admin.enrollment.history.service/enrollment.history.service';
import type { StudentEnrollmentHistorySchema } from '../../../schema/admin.dto/admin.enrollment.history.dto/admin.enrollment.history.dto';

type HistoryRequest = Request<StudentEnrollmentHistorySchema['params'], {}, {}, StudentEnrollmentHistorySchema['query']>;

/** GET: subjects the student has LEFT (never mixed with current enrolments). ADMIN only; enforced by the route. */
export const getStudentEnrollmentHistoryHandler = async (req: HistoryRequest, res: Response, next: NextFunction) => {
    const termId = req.query.termId ? +req.query.termId : undefined;
    res.status(200).json(await findStudentEnrollmentHistory(+req.params.id, termId));
};

/** GET: class attendance that was kept when the student left a subject. ADMIN only; enforced by the route. */
export const getArchivedClassAttendanceHandler = async (req: HistoryRequest, res: Response, next: NextFunction) => {
    const termId = req.query.termId ? +req.query.termId : undefined;
    res.status(200).json(await findArchivedClassAttendance(+req.params.id, termId));
};
