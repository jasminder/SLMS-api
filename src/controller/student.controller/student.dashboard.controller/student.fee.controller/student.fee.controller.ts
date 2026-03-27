import { NextFunction, Request, Response } from 'express';
import { CreatePaymentIntentSchema, FeePaymentIdParamSchema, FetchFeePaymentsForCurrentTermByStudentIdSchema, GetPaymentsByFeePaymentIdStudentSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.fee.dto/student.fee.dto';
import { createStudentPortalPaymentIntent, feePaymentByIdForStudentPortal, fetchFeePaymentsForCurrentTermByStudentId, getPaymentsByFeePaymentIdStudentPortal } from '../../../../service/student.service/student.fee.service/student.fee.service';

export const fetchCurrentTermFeePaymentsHandler = async (req: Request<FetchFeePaymentsForCurrentTermByStudentIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const feePayments = await fetchFeePaymentsForCurrentTermByStudentId(studentId);
    res.json(feePayments);
};

export const feePaymentByIdForStudentPortaleHandler = async (req: Request<FeePaymentIdParamSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { feePaymentId } = req.params;
    const result = await feePaymentByIdForStudentPortal(feePaymentId);
    res.json(result);
};
export const getPaymentsByFeePaymentIdStudentHandler = async (req: Request<GetPaymentsByFeePaymentIdStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const feePaymentId = req.params.feePaymentId;
    const payments = await getPaymentsByFeePaymentIdStudentPortal(feePaymentId);
    res.status(200).json(payments);
};

export const createPaymentIntentForStudentPortalHandler = async (
    req: Request<{}, {}, CreatePaymentIntentSchema['body'], {}>
    ,
    res: Response,
    next: NextFunction
) => {
    const { feePaymentId, currency = 'aud' } = req.body;
    const intent = await createStudentPortalPaymentIntent(feePaymentId, currency);
    res.status(200).json(intent);
};
