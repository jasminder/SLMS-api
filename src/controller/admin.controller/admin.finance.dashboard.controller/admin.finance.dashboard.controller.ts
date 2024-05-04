import { NextFunction, Request, Response } from 'express';
import { getAllFeePayments } from '../../../service/admin.service/admin.finance.dashboard.service/admin.finance.dashboard.service';
import { FindAllFeePaymentRecordsSchema } from '../../../schema/admin.dto/admin.finance.dashboard.dto/admin.finance.dashboard.dto';

export const getAllFeePaymentsHandler = async (req: Request<{}, {}, {}, FindAllFeePaymentRecordsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;
    if (page && termId) {
        const feePayments = await getAllFeePayments(+page, +termId);
        res.status(200).json(feePayments);
    } else if (termId) {
        const page = 0;
        const feePayments = await getAllFeePayments(page, +termId);
        res.status(200).json(feePayments);
    }
};
