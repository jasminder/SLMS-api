import { NextFunction, Request, Response } from 'express';
import { createGroupClasswork } from '../../../service/teacher.service/teacher.classwork.service/teacher.classwork.service';
import { CreateGroupClassworkSchema } from '../../../schema/teacher.dto/teacher.classwork.dto/teacher.classwork.dto';

export const createGroupClassworkHandler = async (req: Request<{}, {}, CreateGroupClassworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds, teacherId, termSubjectLevelId, sectionId, title, classworkDetails, className, roomName, classTime } = req.body;
    const classwork = await createGroupClasswork(studentIds, teacherId, termSubjectLevelId, sectionId, title, classworkDetails, className, roomName, classTime);
    res.status(201).json(classwork);
};
