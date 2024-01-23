// institution.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CreateInstitutionSchema } from '../../../schema/admin.dto/admin.institution.dto/admin.institution.dto';
import { createInstitution, getInstitution } from '../../../service/admin.service/admin.institution.service/admin.institution.service';

export const createInstitutionHandler = async (req: Request<{}, {}, CreateInstitutionSchema['body']>, res: Response) => {
    const institution = await createInstitution(req.body);
    res.status(201).json(institution);
};
export const getInstitutionHandler = async (req: Request, res: Response, next: NextFunction) => {
    const institutionDetails = await getInstitution();
    res.status(200).json(institutionDetails);
};
