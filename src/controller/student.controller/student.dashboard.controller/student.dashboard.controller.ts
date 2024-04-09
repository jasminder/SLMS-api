import { NextFunction, Request, Response } from 'express';
import { FindStudentsByEmailSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import { findStudentsByEmail } from '../../../service/student.service/student.dashboard.service/student.dashboard.service';

export const findStudentsByEmailHandler = async (req: Request<FindStudentsByEmailSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { email } = req.params;
    try {
        const students = await findStudentsByEmail(email);
        res.status(200).json(students);
    } catch (error) {
        next(error);
    }
};
