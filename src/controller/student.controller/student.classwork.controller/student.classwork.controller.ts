import { NextFunction, Request, Response } from 'express';
import { fetchStudentClasswork } from '../../../service/student.service/student.classwork.service/student.classwork.service';
import { FetchStudentClassworkSchema } from '../../../schema/student.dto/student.classwork.dto/student.classwork.dto';

export const fetchStudentClassworkHandler = async (req: Request<FetchStudentClassworkSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, termSubjectLevelId, sectionId } = req.params;
    const classworks = await fetchStudentClasswork(+studentId, +termSubjectLevelId, +sectionId);

    res.status(200).json(classworks);
};
