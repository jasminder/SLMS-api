import { NextFunction, Request, Response } from 'express';
import { CreateSkipReportByStudentSchema, GetSkipReportsByStudentSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.communication.dto/student.communication.dto';
import { createSkipReportByStudent, getSkipReportsByStudent } from '../../../../service/student.service/student.communication.service/student.communication.service';

export const createSkipReportByStudentHandler = async (req: Request<CreateSkipReportByStudentSchema['params'], {}, CreateSkipReportByStudentSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const { reason } = req.body;

    const SkipReport = await createSkipReportByStudent(studentId, reason);
    res.status(200).json(SkipReport);
};


export const getSkipReportsByStudentHandler = async (req: Request<GetSkipReportsByStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const skipReports = await getSkipReportsByStudent(studentId);
    res.status(200).json(skipReports);
};