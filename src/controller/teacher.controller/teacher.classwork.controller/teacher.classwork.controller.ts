import { NextFunction, Request, Response } from 'express';
import { createGroupClasswork, findAssignedClassworks } from '../../../service/teacher.service/teacher.classwork.service/teacher.classwork.service';
import { CreateGroupClassworkSchema, FindAssignedClassworksSchema } from '../../../schema/teacher.dto/teacher.classwork.dto/teacher.classwork.dto';

export const createGroupClassworkHandler = async (req: Request<{}, {}, CreateGroupClassworkSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds, teacherId, termSubjectLevelId, sectionId, title, classworkDetails, className, roomName, classTime,classworkIds } = req.body;
    const classwork = await createGroupClasswork(studentIds, teacherId, termSubjectLevelId, sectionId, title, classworkDetails, className, roomName, classTime,classworkIds);
    res.status(201).json(classwork);
};

export const findAssignedClassworksHandler = async (req: Request<FindAssignedClassworksSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { teacherId, termSubjectLevelId, sectionId } = req.params;
    const assignedClassworks = await findAssignedClassworks(teacherId, termSubjectLevelId, sectionId);
    res.status(200).json(assignedClassworks);
};
