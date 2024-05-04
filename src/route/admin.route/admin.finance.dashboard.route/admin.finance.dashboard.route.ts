import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { getAllFeePaymentsHandler } from '../../../controller/admin.controller/admin.finance.dashboard.controller/admin.finance.dashboard.controller';
import { findAllFeePaymentRecordsSchema } from '../../../schema/admin.dto/admin.finance.dashboard.dto/admin.finance.dashboard.dto';

const adminFinanceDashboardRoute = express.Router();

adminFinanceDashboardRoute.route('/all-fee-payments-records').get(validate(findAllFeePaymentRecordsSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllFeePaymentsHandler));

export default adminFinanceDashboardRoute;