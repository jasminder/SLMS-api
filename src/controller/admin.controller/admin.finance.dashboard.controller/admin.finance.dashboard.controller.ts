import { NextFunction, Request, Response } from 'express';
import { getAllFeePayments, getAllInvoiceNamesByTermId, getAllTerms } from '../../../service/admin.service/admin.finance.dashboard.service/admin.finance.dashboard.service';
import { FindAllFeePaymentRecordsSchema, GetAllInvoiceNamesByTermIdSchema } from '../../../schema/admin.dto/admin.finance.dashboard.dto/admin.finance.dashboard.dto';

export const getAllFeePaymentsHandler = async (req: Request<{}, {}, {}, FindAllFeePaymentRecordsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId, dueAmountSort, paymentStatus, search, invoiceName } = req.query;
    if (page && termId) {
        const feePayments = await getAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceName);
        res.status(200).json(feePayments);
    } else if (termId) {
        const page = 0;
        const feePayments = await getAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceName);
        res.status(200).json(feePayments);
    }
};

export const getAllInvoiceNamesByTermIdHandler = async (req: Request<{}, {}, {}, GetAllInvoiceNamesByTermIdSchema['query']>, res: Response, next: NextFunction) => {
    const { termId } = req.query;
    const feeTemplates = await getAllInvoiceNamesByTermId(termId);
    res.status(200).json(feeTemplates);
};

export const getAllTermsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const terms = await getAllTerms();
    res.status(200).json(terms);
};
