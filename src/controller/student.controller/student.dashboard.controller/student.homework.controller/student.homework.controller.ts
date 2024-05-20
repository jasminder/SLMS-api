import { NextFunction, Request, Response } from 'express';

import { FetchStudentHomeworkSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.homework.dto/student.homework.dto';
import { fetchStudentHomework } from '../../../../service/student.service/student.homework.service/student.homework.service';

export const fetchStudentHomeworkHandler = async (req: Request<FetchStudentHomeworkSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, termSubjectLevelId, sectionId } = req.params;
    const homeworks = await fetchStudentHomework(+studentId, +termSubjectLevelId, +sectionId);

    res.status(200).json(homeworks);
};
