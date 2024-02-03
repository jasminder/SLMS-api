import { NextFunction, Request, Response } from 'express';
import { createGroupHomework } from '../../../service/teacher.service/teacher.homework.service/teacher.homework.service';
import { CreateGroupHomeworkSchema } from '../../../schema/teacher.dto/teacher.homework.dto/teacher.homework.dto';

export const createGroupHomeworkHandler = async (req: Request<{}, {}, CreateGroupHomeworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, teacherId, title, className, roomName, sectionId, termSubjectLevelId, attachments, description ,classTime} = req.body;
    const feedback = await createGroupHomework(studentId, teacherId, termSubjectLevelId, sectionId, title, description, attachments, className, roomName, classTime);
    res.status(201).json(feedback);
};
