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
    feePaymentByIdForStudentPortaleHandler,
    getPaymentsByFeePaymentIdStudentHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.fee.controller/student.fee.controller';

const studentFeeRoute = express.Router();

studentFeeRoute
    .route('/fetch-current-term-fee-payments-list/:studentId')
    .get(validate(fetchFeePaymentsForCurrentTermByStudentIdSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(fetchCurrentTermFeePaymentsHandler));


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
