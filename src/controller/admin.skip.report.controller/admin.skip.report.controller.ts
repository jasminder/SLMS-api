import { NextFunction, Request, Response } from 'express';
import { CloseSkipReportSchema, CreateSkipReportSchema, GetSkipReportsSchema, UpdateSkipReportReasonSchema } from '../../schema/admin.dto/admin.skip.report.dto/admin.skip.report.dto';
import { closeSkipReport, createSkipReport, getSkipReports, updateSkipReportReason } from '../../service/admin.service/admin.skip.report.service/admin.skip.report.service';

export const updateSkipReportReasonHandler = async (req: Request<UpdateSkipReportReasonSchema['params'], {}, UpdateSkipReportReasonSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { skipReportId } = req.params;
    const { reason } = req.body;
    const updatedReport = await updateSkipReportReason(skipReportId, reason);
    res.status(200).json(updatedReport);
};

export const getSkipReportsHandler = async (req: Request<GetSkipReportsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const skipReports = await getSkipReports(studentId);
    res.status(200).json(skipReports);
};
/* create student skip report*/
export const createSkipReportHandler = async (req: Request<CreateSkipReportSchema['params'], {}, CreateSkipReportSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { adminId, studentId } = req.params;
    const { reason, className } = req.body;

    const SkipReport = await createSkipReport(studentId, adminId, reason, className);
    res.status(200).json(SkipReport);
};


export const closeSkipReportHandler = async (req: Request<CloseSkipReportSchema['params'], {}, CloseSkipReportSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { skipReportId } = req.params;
    const { reason, adminClosingRemarks } = req.body;
    const updatedReport = await closeSkipReport(skipReportId, reason, adminClosingRemarks);
    res.status(200).json(updatedReport);
};