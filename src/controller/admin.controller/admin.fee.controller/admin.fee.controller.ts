import { NextFunction, Request, Response } from 'express';
import { createFeeTemplateAndPayments } from '../../../service/admin.service/admin.fee.service/admin.fee.service';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
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
