import { NextFunction, Request, Response } from 'express';
import {
    createClassWithSections,
    deleteSection,
    fetchStudentCountInClass,
    findCurrentTermClasses,
    findCurrentTermForManageClass,
    findPublishTermForManageClass,
    findSectionsForManageClass,
    getAllSections
} from '../../../../service/admin.service/admin.administration.service/admin.manage.class.service/admin.manage.class.service';
import { CreateClassWithSectionsSchema, DeleteSectionSchema, FetchStudentCountInClass } from '../../../../schema/admin.dto/admin.administration.dto/admin.manage.class.dto/admin.manage.class.dto';

export const findPublishTermForManageClassHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTerm = await findPublishTermForManageClass();
    res.status(200).json(currentTerm);
};
export const findCurrentTermForManageClassHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTerm = await findCurrentTermForManageClass();
    res.status(200).json(currentTerm);
};
export const findCurrentTermClassesHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTermClasses = await findCurrentTermClasses();
    res.status(200).json(currentTermClasses);
};
export const findSectionsForManageClassHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const sections = await findSectionsForManageClass();
    res.status(200).json(sections);
};
export const createClassWithSectionsHandler = async (req: Request<{}, {}, CreateClassWithSectionsSchema['body'], {}>, res: Response, next: NextFunction) => {
    const createClassData = req.body;
    const sections = await createClassWithSections(createClassData);
    res.status(200).json(sections);
};
export const getAllSectionsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const sections = await getAllSections();
    res.status(200).json(sections);
};

export const deleteSectionHandler = async (req: Request<DeleteSectionSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { sectionId } = req.params;

    await deleteSection(sectionId);
    res.status(204).json({
        status: 'success',
        message: 'Section deleted successfully'
    });
};

export const fetchStudentCountInClassHandler = async (req: Request<{}, {}, {}, FetchStudentCountInClass['query']>, res: Response, next: NextFunction) => {
    const { termSubjectLevelId, sectionId } = req.query;

    if (termSubjectLevelId && sectionId) {
        const count = await fetchStudentCountInClass(termSubjectLevelId, sectionId);
        res.status(200).json({ count });
    } else {
        res.status(400).json({ message: 'termSubjectLevelId and sectionId are required' });
    }
};
