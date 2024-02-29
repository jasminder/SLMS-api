import { Request, Response, NextFunction } from 'express';

import {
    fetchActiveCheckedInStudents,
    fetchCheckedOutStudents,
    fetchStudentsOnAbsent,
    fetchStudentsOnAttendance,
    fetchStudentsOnLeave
} from '../../../service/admin.service/admin.dashboard.service/admin.dashboard.service';
import {
    FetchActiveCheckedInStudentsSchema,
    FetchCheckedOutStudentsSchema,
    FetchStudentsOnAbsentSchema,
    FetchStudentsOnAttendanceSchema,
    FetchStudentsOnLeaveSchema
} from '../../../schema/admin.dto/admin.dashboard.dto/admin.dashboard.dto';

export const fetchActiveCheckedInStudentsHandler = async (req: Request<{}, {}, {}, FetchActiveCheckedInStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchActiveCheckedInStudents(dateString);
    res.status(200).json(students);
};
export const fetchCheckedOutStudentsHandler = async (req: Request<{}, {}, {}, FetchCheckedOutStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchCheckedOutStudents(dateString);
    res.status(200).json(students);
};
export const fetchStudentsOnLeaveHandler = async (req: Request<{}, {}, {}, FetchStudentsOnLeaveSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchStudentsOnLeave(dateString);
    res.status(200).json(students);
};
export const fetchStudentsOnAbsentHandler = async (req: Request<{}, {}, {}, FetchStudentsOnAbsentSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchStudentsOnAbsent(dateString);
    res.status(200).json(students);
};
export const fetchStudentsOnAttendanceHandler = async (req: Request<{}, {}, {}, FetchStudentsOnAttendanceSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchStudentsOnAttendance(dateString);
    res.status(200).json(students);
};
