import { Request, Response, NextFunction } from 'express';

import {
    fetchActiveCheckedInStudents,
    fetchCheckedOutStudents,
    fetchPendingLeaves,
    fetchStudentsOnAbsent,
    fetchStudentsOnAttendance,
    fetchStudentsOnLeave,
    fetchWeekdayActiveCheckedInStudents,
    findActiveStudentsWithFlags,
    searchActiveStudentsWithFlags
} from '../../../service/admin.service/admin.dashboard.service/admin.dashboard.service';
import {
    FetchActiveCheckedInStudentsSchema,
    FetchCheckedOutStudentsSchema,
    FetchStudentsOnAbsentSchema,
    FetchStudentsOnAttendanceSchema,
    FetchStudentsOnLeaveSchema,
    FindAllActiveStudentsWithFlagsSchema,
    SearchActiveStudentsWithFlagsSchema
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

export const findActiveStudentsWithFlagsHandler = async (req: Request<{}, {}, {}, FindAllActiveStudentsWithFlagsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findActiveStudentsWithFlags(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findActiveStudentsWithFlags(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const searchActiveStudentsWithFlagsHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsWithFlagsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudentsWithFlags(search, +page, +termId, subjectOption, levelOption, sectionOption);
        res.status(200).json(searchResult);
    }
};
/****************************/
export const fetchWeekdayActiveCheckedInStudentsHandler = async (req: Request<{}, {}, {}, FetchActiveCheckedInStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { dateString } = req.query;
    const students = await fetchWeekdayActiveCheckedInStudents(dateString);
    res.status(200).json(students);
};
export const fetchPendingLeavesHandler = async (req: Request, res: Response, next: NextFunction) => {
    const pendingLeaves = await fetchPendingLeaves();
    res.status(200).json(pendingLeaves);
};
