import { NextFunction, Request, Response } from 'express';
import { closeSkipReportToday, findSkipReportsForToday } from '../../../service/admin.service/admin.attendance.service/admin.attendance.service';
import { CloseSkipReportTodaySchema } from '../../../schema/admin.dto/admin.attendance.dto/admin.attendance.dto';


/*create default class attendance for each student in student assignment*/

/*get skip report if the the student has skipped a class */
export const findSkipReportsForTodayHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const skipReport = await findSkipReportsForToday();
    res.status(200).json(skipReport);
};

/*close skip report if the the student has skipped a class */
export const closeSkipReportTodayHandler = async (req: Request<CloseSkipReportTodaySchema['params'], {}, CloseSkipReportTodaySchema['body'], {}>, res: Response, next: NextFunction) => {
    const { skipReportId } = req.params;
    const { closingRemark } = req.body;
    const skipReport = await closeSkipReportToday(skipReportId,closingRemark);
    res.status(200).json(skipReport);
};
