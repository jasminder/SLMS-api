import { NextFunction, Request, Response } from 'express';
import { createGroupHomework, findAssignedHomeworks } from '../../../service/teacher.service/teacher.homework.service/teacher.homework.service';
import { CreateGroupHomeworkSchema, FindAssignedHomeworksSchema } from '../../../schema/teacher.dto/teacher.homework.dto/teacher.homework.dto';

export const createGroupHomeworkHandler = async (req: Request<{}, {}, CreateGroupHomeworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds, teacherId, title, className, roomName, sectionId, termSubjectLevelId, homeworkDetails, classTime, homeworkIds, sendDate } = req.body;
    const homework = await createGroupHomework(studentIds, teacherId, termSubjectLevelId, sectionId, title, homeworkDetails, className, roomName, classTime, homeworkIds, sendDate);
    res.status(201).json(homework);
};
export const findAssignedHomeworksHandler = async (req: Request<FindAssignedHomeworksSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { teacherId, termSubjectLevelId, sectionId } = req.params;
    const assignedHomeworks = await findAssignedHomeworks(teacherId, termSubjectLevelId, sectionId);
    res.status(200).json(assignedHomeworks);
};
