import { Request, Response, NextFunction } from 'express';
import { createClasswork, findAllClassworksBySubjectsList } from '../../service/classwork.service/classwork.service';
import { CreateClassworkSchema, FindAllClassworksBySubjectsList } from '../../schema/classwork.dto/classwork.dto';

export const createClassworkHandler = async (req: Request<CreateClassworkSchema['params'], {}, CreateClassworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { attachments, description, title, uploadedUserRole } = req.body;
    const { termSubjectLevelId, uploaderId } = req.params;
    const newClasswork = await createClasswork(termSubjectLevelId, uploaderId, uploadedUserRole, title, description, attachments);

    res.status(200).json(newClasswork);
};
export const findClassworkBySubjectListHandler = async (req: Request<FindAllClassworksBySubjectsList['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
   
    const { termSubjectLevelIds, teacherId } = req.params;
    const termSubjectLevelIdsArray = termSubjectLevelIds.split(',').map((id) => id);
    const classwork = await findAllClassworksBySubjectsList(termSubjectLevelIdsArray, teacherId);
    res.status(200).json(classwork);
};
