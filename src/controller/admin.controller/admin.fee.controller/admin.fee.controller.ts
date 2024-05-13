import { NextFunction, Request, Response } from 'express';
import {
    createFeeTemplateAndPayments,
    defaultSelectActiveStudentsForFeeCreation,
    fetchFeeTemplatesByTerm,
    findActiveStudentsForFeeCreation,
    findAllCurrentTermSubjectGroups,
    searchActiveStudentsForFeeCreation,
    selectActiveStudentsForFeeCreation,
    undoCreateFeeTemplateAndPayments
} from '../../../service/admin.service/admin.fee.service/admin.fee.service';
import {
    DefaultSelectActiveStudentsForFeeCreationSchema,
    FeeTemplateDataSchema,
    FeeTemplateQueryByTermIdSchema,
    FeeTemplateUndoSchema,
    FindAllActiveStudentsForFeeCreationSchema,
    SearchActiveStudentsForfeeCreationSchema,
    SelectActiveStudentsForFeeCreationSchema
} from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
/*export const findAllTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allTerms = await findAllTerm();
    res.status(200).json(allTerms);
};
*/
export const createFeeTemplateHandler = async (req: Request<{}, {}, FeeTemplateDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const feeTemplateData = req.body;
    const result = await createFeeTemplateAndPayments(feeTemplateData);
    res.status(201).json(result);
};
export const undoCreateFeeTemplateHandler = async (req: Request<FeeTemplateUndoSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const {feeTemplateId} = req.params;
    const result = await undoCreateFeeTemplateAndPayments(+feeTemplateId);
    res.status(200).json(result);
};
export const getCurrentTermSubjectGroupsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const termSubjectGroups = await findAllCurrentTermSubjectGroups();
    res.status(200).json(termSubjectGroups);
};
export const findActiveStudentsForFeeCreationHandler = async (req: Request<{}, {}, {}, FindAllActiveStudentsForFeeCreationSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findActiveStudentsForFeeCreation(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findActiveStudentsForFeeCreation(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const defaultSelectActiveStudentsForFeeCreationHandler = async (req: Request<{}, {}, {}, DefaultSelectActiveStudentsForFeeCreationSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;
    if (page && termId) {
        const allStudent = await defaultSelectActiveStudentsForFeeCreation(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await defaultSelectActiveStudentsForFeeCreation(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const searchActiveStudentsForFeeCreationHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsForfeeCreationSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0, termId, termSubjectGroupId } = req.query;

    const searchResult = await searchActiveStudentsForFeeCreation(search, +page, +termId, +termSubjectGroupId);
    res.status(200).json(searchResult);
};
export const selectActiveStudentsForFeeCreationHandler = async (req: Request<{}, {}, {}, SelectActiveStudentsForFeeCreationSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0, termId, termSubjectGroupId } = req.query;
    if (termId && termSubjectGroupId) {
        const searchResult = await selectActiveStudentsForFeeCreation(search, +page, +termId, +termSubjectGroupId);
        res.status(200).json(searchResult);
    }
};
export const fetchFeeTemplatesByTermHandler = async (req: Request<{}, {}, {}, FeeTemplateQueryByTermIdSchema['query']>, res: Response, next: NextFunction) => {
    const {termId} = req.query;
    const feeTemplates = await fetchFeeTemplatesByTerm(+termId);
    res.status(200).json({ feeTemplates });
};
