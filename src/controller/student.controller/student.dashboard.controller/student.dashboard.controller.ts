import { NextFunction, Request, Response } from 'express';
import { FindActiveStudentDetailsSchema, FindStudentsByEmailSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import { findStudentDetailsById, findStudentsByEmail } from '../../../service/student.service/student.dashboard.service/student.dashboard.service';

export const findStudentsByEmailHandler = async (req: Request<FindStudentsByEmailSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { email } = req.params;
    const students = await findStudentsByEmail(email);
    res.status(200).json(students);
};
export const findStudentDetailsByIdHandler = async (req: Request<FindActiveStudentDetailsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const student = await findStudentDetailsById(studentId);
    res.status(200).json(student);
};
