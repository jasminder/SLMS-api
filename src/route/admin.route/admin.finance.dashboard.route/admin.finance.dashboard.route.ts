import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    getAllFeePaymentsHandler,
    getAllInvoiceNamesByTermIdHandler,
    getAllTermsHandler,
    selectAllFeePaymentsHandler
} from '../../../controller/admin.controller/admin.finance.dashboard.controller/admin.finance.dashboard.controller';
import { findAllFeePaymentRecordsSchema, getAllInvoiceNamesByTermIdSchema, selectAllFeePaymentsSchema } from '../../../schema/admin.dto/admin.finance.dashboard.dto/admin.finance.dashboard.dto';

const adminFinanceDashboardRoute = express.Router();

adminFinanceDashboardRoute.route('/all-fee-payments-records').get(validate(findAllFeePaymentRecordsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllFeePaymentsHandler));
adminFinanceDashboardRoute.route('/select-all-fee-payments-records').get(validate(selectAllFeePaymentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(selectAllFeePaymentsHandler));

adminFinanceDashboardRoute.route('/all-invoice-names-by-termId').get(validate(getAllInvoiceNamesByTermIdSchema), protectRoute, restrict('ADMIN'), getAllInvoiceNamesByTermIdHandler);

adminFinanceDashboardRoute.route('/all-term-for-finance-dashboard').get(protectRoute, restrict('ADMIN'), getAllTermsHandler);

export default adminFinanceDashboardRoute;
