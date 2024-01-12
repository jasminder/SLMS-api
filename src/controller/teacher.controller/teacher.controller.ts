import { NextFunction, Request, Response } from 'express';
import { FindTeacherByIdSchema } from '../../schema/teacher.dto/teacher.dto';
import { findTeacherByIdForTeacher } from '../../service/teacher.service/teacher.service';

// find unqiue teacherby ID for internal queries
export const findTeacherByIdForTeacherHandler = async (req: Request<FindTeacherByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const teacher = await findTeacherByIdForTeacher(id);
    res.status(200).json(teacher);
}; 