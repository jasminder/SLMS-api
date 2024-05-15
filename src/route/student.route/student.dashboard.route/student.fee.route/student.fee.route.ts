import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import { feePaymentIdParamSchema, fetchFeePaymentsForCurrentTermByStudentIdSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.fee.dto/student.fee.dto';
import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';
import {
    fetchCurrentTermFeePaymentsHandler,
    fetchFeePaymentByIdForStudentPortalInvoiceHandler
} from '../../../../controller/student.controller/student.dashboard.controller/student.fee.controller/student.fee.controller';

const studentFeeRoute = express.Router();

studentFeeRoute
    .route('/fetch-current-term-fee-payments-list/:studentId')
    .get(validate(fetchFeePaymentsForCurrentTermByStudentIdSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(fetchCurrentTermFeePaymentsHandler));
studentFeeRoute.route('/fetch-fee-payment-details/:feePaymentId').get(validate(feePaymentIdParamSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(fetchFeePaymentByIdForStudentPortalInvoiceHandler));

export default studentFeeRoute;
