import { NextFunction, Request, Response } from 'express';

import { CheckEmailQuerySchema, NewApplicantSchema } from '../../schema/new.applicant.dto/new.applicant.dto';
import { checkEmailForApplication, createApplicant, findPublishTerm } from '../../service/new.applicant.service/new.applicant.service';

export const checkEmailHandler = async (
    req: Request<{}, {}, {}, { email: string; applicationType: 'teacher' | 'student' }>,
    res: Response,
    next: NextFunction
) => {
    const { email, applicationType } = req.query;
    const result = await checkEmailForApplication(email, applicationType);
    res.status(200).json(result);
};

export const createApplicantHandler = async (req: Request<{}, {}, NewApplicantSchema['body'], {}>, res: Response, next: NextFunction) => {
    const data = req.body;
    const newApplicant = await createApplicant(data);
    res.status(200).json(newApplicant);
};

export const findPublishTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const activeTerm = await findPublishTerm();
    res.status(200).json(activeTerm);
};
