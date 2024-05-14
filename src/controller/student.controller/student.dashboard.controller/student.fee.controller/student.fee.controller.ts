import { NextFunction, Request, Response } from 'express';
import { FeePaymentIdParamSchema, FetchFeePaymentsForCurrentTermByStudentIdSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.fee.dto/student.fee.dto';
import { feePaymentByIdForStudentPortalInvoice, fetchFeePaymentsForCurrentTermByStudentId } from '../../../../service/student.service/student.fee.service/student.fee.service';

export const fetchCurrentTermFeePaymentsHandler = async (req: Request<FetchFeePaymentsForCurrentTermByStudentIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const feePayments = await fetchFeePaymentsForCurrentTermByStudentId(studentId);
    res.json(feePayments);
};



export const fetchFeePaymentDetailsHandler = async (req: Request<FeePaymentIdParamSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { feePaymentId } = req.params;
    const result = await feePaymentByIdForStudentPortalInvoice(feePaymentId);
    res.json(result);
};
