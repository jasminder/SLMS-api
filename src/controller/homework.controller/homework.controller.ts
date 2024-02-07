import { NextFunction, Request, Response } from 'express';
import { createHomework, findAllHomeworksBySubjectsList, findHomeworkById } from '../../service/homework.service/homework.service';
import { CreateHomeworkSchema, FindAllHomeworksBySubjectsList, FindHomeworkByIdSchema } from '../../schema/homework.dto/homework.dto';

export const createHomeworkHandler = async (req: Request<CreateHomeworkSchema['params'], {}, CreateHomeworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { attachments, description, title, uploadedUserRole } = req.body;
    const { termSubjectLevelId, uploaderId } = req.params;
    const newHomework = await createHomework(termSubjectLevelId, uploaderId, uploadedUserRole, title, description, attachments);

    res.status(200).json(newHomework);
};

export const findHomeworkByIdHandler = async (req: Request<FindHomeworkByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { homeworkId } = req.params;
    const homework = await findHomeworkById(homeworkId);
    res.status(200).json(homework);
};
export const findHomeworkBySubjectListHandler = async (req: Request<FindAllHomeworksBySubjectsList['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { termSubjectLevelIds, teacherId } = req.params;
    const termSubjectLevelIdsArray = termSubjectLevelIds .split(',').map((id) => id);
    const homework = await findAllHomeworksBySubjectsList(termSubjectLevelIdsArray,teacherId);
    res.status(200).json(homework);
};
