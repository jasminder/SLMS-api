import express from 'express';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createFeeExemptionHandler, findStudentsForExemptionHandler, getStudentFeeExemptionsHandler, listFeeExemptionsHandler, switchOffFeeExemptionHandler } from '../../../controller/admin.controller/admin.fee.exemption.controller/admin.fee.exemption.controller';

/* Scope of Work item 20 (B5): fee exemption between two dates. ADMIN only. */
const adminFeeExemptionRoute = express.Router();

adminFeeExemptionRoute.route('/').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(listFeeExemptionsHandler)).post(protectRoute, restrict('ADMIN'), asyncErrorHandler(createFeeExemptionHandler));
adminFeeExemptionRoute.route('/find-students').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findStudentsForExemptionHandler));
adminFeeExemptionRoute.route('/student/:studentId').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getStudentFeeExemptionsHandler));
adminFeeExemptionRoute.route('/:id/switch-off').patch(protectRoute, restrict('ADMIN'), asyncErrorHandler(switchOffFeeExemptionHandler));

export default adminFeeExemptionRoute;
