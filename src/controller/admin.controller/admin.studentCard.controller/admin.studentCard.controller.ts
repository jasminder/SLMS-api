import { NextFunction, Request, Response } from 'express';
import { findActiveStudentsWithoutPagination, searchActiveStudentsWithoutPagination } from '../../../service/admin.service/admin.studentCard.service/admin.studentCard.service';
import { FindAllActiveStudentsWOPaginatonSchema, SearchActiveStudentsWOPaginatonSchema } from '../../../schema/admin.dto/admin.studentCard.dto/admin.studentCard.dto';

export const findActiveStudentsWithoutPaginationHandler = async (req: Request<{}, {}, {}, FindAllActiveStudentsWOPaginatonSchema['query']>, res: Response, next: NextFunction) => {
    const { termId } = req.query;

    if (termId) {
        const allStudent = await findActiveStudentsWithoutPagination(+termId);
        res.status(200).json(allStudent);
    }
};

export const searchActiveStudentsWithoutPaginationHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsWOPaginatonSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, termId } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudentsWithoutPagination(search, +termId, subjectOption);
        res.status(200).json(searchResult);
    }
};
