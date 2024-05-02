import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { feeTemplateSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createFeeTemplateHandler } from '../../../controller/admin.controller/admin.fee.controller/admin.fee.controller';

const adminFeeRoute = express.Router();

// routes/feeTemplateRoutes.js
adminFeeRoute.route('/create-fee-template-and-feePayments-records-for-active-students-by-subject-group').post(validate(feeTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createFeeTemplateHandler));

export default adminFeeRoute;