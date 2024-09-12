import { NextFunction, Request, Response } from 'express';
import {
    feeDashboardQuery,
    filteredFeeDashboardQuery,
    getAllFeePayments,
    getAllInvoiceNamesByTermId,
    getAllTerms,
    selectAllFeePayments
} from '../../../service/admin.service/admin.finance.dashboard.service/admin.finance.dashboard.service';
import {
    FilteredFeeDashboardQuerySchema,
    FindAllFeePaymentRecordsSchema,
    GetAllInvoiceNamesByTermIdSchema,
    SelectAllFeePaymentsSchema
} from '../../../schema/admin.dto/admin.finance.dashboard.dto/admin.finance.dashboard.dto';
import { PaymentStatus } from '@prisma/client';

export const getAllFeePaymentsHandler = async (req: Request<{}, {}, {}, FindAllFeePaymentRecordsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId, dueAmountSort, paymentStatus, search, invoiceId } = req.query;
    if (page && termId) {
        const feePayments = await getAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceId);
        res.status(200).json(feePayments);
    } else if (termId) {
        const page = 0;
        const feePayments = await getAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceId);
        res.status(200).json(feePayments);
    }
};
export const selectAllFeePaymentsHandler = async (req: Request<{}, {}, {}, SelectAllFeePaymentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId, dueAmountSort, paymentStatus, search, invoiceName } = req.query;
    if (page && termId) {
        const feePayments = await selectAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceName);
        res.status(200).json(feePayments);
    } else if (termId) {
        const page = 0;
        const feePayments = await selectAllFeePayments(search, +page, +termId, paymentStatus, dueAmountSort, invoiceName);
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

export const feeDashboardQueryHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { termId } = req.params;
    const FeeDashbordDetails = await feeDashboardQuery();
    res.json({ FeeDashbordDetails });
};

export const filteredFeeDashboardQueryHandler = async (req: Request<{}, {}, {}, FilteredFeeDashboardQuerySchema['query']>, res: Response, next: NextFunction) => {
    const { termId, invoiceId, paymentStatus } = req.query;
    console.log(termId, invoiceId, paymentStatus);
    if (!termId) {
        return res.status(400).json({ error: 'TermId is required' });
    }

    const parsedTermId = parseInt(termId as string, 10);
    if (isNaN(parsedTermId)) {
        return res.status(400).json({ error: 'Invalid termId' });
    }

    const parsedInvoiceId = invoiceId ? parseInt(invoiceId as string, 10) : undefined;
    if (invoiceId && isNaN(parsedInvoiceId!)) {
        return res.status(400).json({ error: 'Invalid invoiceId' });
    }

    const validPaymentStatuses = ['PAID', 'UNPAID', 'OVERDUE', 'PENDING'];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus as string)) {
        return res.status(400).json({ error: 'Invalid paymentStatus' });
    }

    const feeDashboardDetails = await filteredFeeDashboardQuery(parsedTermId, parsedInvoiceId, paymentStatus as PaymentStatus | undefined);

    res.status(200).json({ feeDashboardDetails });
};
