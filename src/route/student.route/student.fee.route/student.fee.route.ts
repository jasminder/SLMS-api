import express from 'express';

import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import validate from '../../../middleware/validateResource';
import {
    createPaymentIntentSchema,
    feePaymentIdParamSchema,
    fetchFeePaymentsForCurrentTermByStudentIdSchema,
    getPaymentsByFeePaymentIdStudentSchema
} from '../../../schema/student.dto/student.dashboard.dto/student.fee.dto/student.fee.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    createPaymentIntentForStudentPortalHandler,
    fetchCurrentTermFeePaymentsHandler,
    fetchAllFeePaymentsHandler,
    feePaymentByIdForStudentPortaleHandler,
    getPaymentsByFeePaymentIdStudentHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.fee.controller/student.fee.controller';

const studentFeeRoute = express.Router();

studentFeeRoute
    .route('/fetch-current-term-fee-payments-list/:studentId')
    .get(validate(fetchFeePaymentsForCurrentTermByStudentIdSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(fetchCurrentTermFeePaymentsHandler));


// Every term's invoices (each with its term) for the parent fee screen's term filter.
studentFeeRoute
    .route('/fetch-fee-payments-list/:studentId')
    .get(validate(fetchFeePaymentsForCurrentTermByStudentIdSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(fetchAllFeePaymentsHandler));

studentFeeRoute
    .route('/fetch-fee-payment-details/:feePaymentId')
    .get(validate(feePaymentIdParamSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(feePaymentByIdForStudentPortaleHandler));
//payment-installments-details-by-feepayment-Id
studentFeeRoute.get(
    '/payment-installments-details-by-feepayment-Id/:feePaymentId',
    validate(getPaymentsByFeePaymentIdStudentSchema),
    protectRoute,
    restrict('ADMIN', 'STUDENT'),
    asyncErrorHandler(getPaymentsByFeePaymentIdStudentHandler)
);

studentFeeRoute.post(
    '/create-payment-intent',
    validate(createPaymentIntentSchema),
    protectRoute,
    restrict('ADMIN', 'STUDENT'),
    asyncErrorHandler(createPaymentIntentForStudentPortalHandler)
);

export default studentFeeRoute;
