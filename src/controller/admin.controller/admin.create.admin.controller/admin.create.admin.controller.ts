import { NextFunction, Request, Response } from 'express';
import { createAdminApplicant } from '../../../service/admin.service/admin.create.admin.service/admin.create.admin.service';
import { AdminApplicantSchema } from '../../../schema/admin.dto/admin.create.admin.dto/admin.create.admin.dto';


export const createAdminApplicantHandler = async (req: Request<{}, {}, AdminApplicantSchema['body'], {}>, res: Response, next: NextFunction) => {
    const data = req.body;
    const newAdminApplicant = await createAdminApplicant(data);
    res.status(200).json(newAdminApplicant);
};