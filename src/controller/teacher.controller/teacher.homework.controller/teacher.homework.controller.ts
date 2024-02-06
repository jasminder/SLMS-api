import { NextFunction, Request, Response } from 'express';
import { createGroupHomework } from '../../../service/teacher.service/teacher.homework.service/teacher.homework.service';
import { CreateGroupHomeworkSchema } from '../../../schema/teacher.dto/teacher.homework.dto/teacher.homework.dto';

export const createGroupHomeworkHandler = async (req: Request<{}, {}, CreateGroupHomeworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds, teacherId, title, className, roomName, sectionId, termSubjectLevelId, homeworkDetails ,classTime} = req.body;
    const homework = await createGroupHomework(studentIds, teacherId, termSubjectLevelId, sectionId, title, homeworkDetails, className, roomName, classTime);
    res.status(201).json(homework);
};
