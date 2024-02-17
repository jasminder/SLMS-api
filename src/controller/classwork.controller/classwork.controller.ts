import { Request, Response, NextFunction } from 'express';
import { createClasswork, deleteclasswork, editClasswork, findAllClassworkByTermAndSection, findAllClassworksBySubjectsList, findClassworkById } from '../../service/classwork.service/classwork.service';
import { CreateClassworkSchema, DeleteClassworkSchema, EditClassworkSchema, FindAllClassworksBySubjectsList, FindClassworkByIdSchema, FindClassworkByTermAndSectionSchema } from '../../schema/classwork.dto/classwork.dto';

export const createClassworkHandler = async (req: Request<CreateClassworkSchema['params'], {}, CreateClassworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { attachments, description, title, uploadedUserRole } = req.body;
    const { termSubjectLevelId, sectionId, uploaderId } = req.params;
    const newClasswork = await createClasswork(termSubjectLevelId, sectionId, uploaderId, uploadedUserRole, title, description, attachments);

    res.status(200).json(newClasswork);
};
export const findClassworkBySubjectListHandler = async (req: Request<FindAllClassworksBySubjectsList['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { termSubjectLevelIds, teacherId } = req.params;
    const termSubjectLevelIdsArray = termSubjectLevelIds.split(',').map((id) => id);
    const classwork = await findAllClassworksBySubjectsList(termSubjectLevelIdsArray, teacherId);
    res.status(200).json(classwork);
};
/* Find all Classwork records for a termsubjectlevelid and sectionid */
export const findClassworkByTermAndSectionHandler = async (req: Request<FindClassworkByTermAndSectionSchema['params'], {}, {}, FindClassworkByTermAndSectionSchema['query']>, res: Response) => {
    const { termSubjectLevelId, sectionId } = req.query;
    const { teacherId } = req.params;
    const Classworks = await findAllClassworkByTermAndSection(termSubjectLevelId, sectionId, teacherId);
    res.status(200).json(Classworks);
};

export const findClassworkByIdHandler = async (req: Request<FindClassworkByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { classworkId } = req.params;
    const Classwork = await findClassworkById(classworkId);
    res.status(200).json(Classwork);
};
/*edit classwork*/
export const editClassworkHandler = async (req: Request<EditClassworkSchema['params'], {}, EditClassworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { classworkId, termSubjectLevelId, sectionId, uploaderId } = req.params;
    const { uploadedUserRole, title, description, attachments } = req.body;

    const updatedclasswork = await editClasswork(classworkId, termSubjectLevelId, sectionId, uploaderId, uploadedUserRole, title, description, attachments);
    res.status(200).json(updatedclasswork);
};
/*delete classwork*/
export const deleteClassworkHandler = async (req: Request<DeleteClassworkSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { classworkId } = req.params;
    await deleteclasswork(classworkId);
    res.status(200).json({ message: 'classwork successfully deleted' });
};