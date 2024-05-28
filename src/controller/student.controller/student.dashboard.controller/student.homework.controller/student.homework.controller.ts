import { NextFunction, Request, Response } from 'express';

import { FetchStudentHomeworkSchema, FetchStudentReportSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.homework.dto/student.homework.dto';
import { fetchStudentHomework, fetchStudentReport } from '../../../../service/student.service/student.homework.service/student.homework.service';

export const fetchStudentHomeworkHandler = async (req: Request<FetchStudentHomeworkSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, termSubjectLevelId, sectionId } = req.params;
    console.log(studentId, termSubjectLevelId, sectionId);
    const homeworks = await fetchStudentHomework(+studentId, +termSubjectLevelId, +sectionId);
    res.status(200).json(homeworks);
};
export const fetchStudentReportHandler = async (req: Request<FetchStudentReportSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    console.log(studentId);
    const homeworks = await fetchStudentReport(+studentId);
    res.status(200).json(homeworks);
};
