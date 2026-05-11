import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';
import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import {
    updateStudentEmergencyDetailSchema,
    updateStudentHealthDetailSchema,
    updateStudentParentsDetailSchema,
    updateStudentPasswordSchema,
    updateStudentPersonalDetailSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.student.update.dto/admin.student.update.dto';
import {
    updateStudentEmergencyContactHandler,
    updateStudentHealthInformationHandler,
    updateStudentParentsDetailHandler,
    updateStudentPasswordHandler,
    updateStudentPersonalDetailHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.student.update.controller/admin.student.update.controller';

const adminStudentUpdateRoute = express.Router();
adminStudentUpdateRoute.route('/personal-detail/:id').patch(validate(updateStudentPersonalDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentPersonalDetailHandler));
adminStudentUpdateRoute.route('/parents-detail/:id').patch(validate(updateStudentParentsDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentParentsDetailHandler));
adminStudentUpdateRoute.route('/health-detail/:id').patch(validate(updateStudentHealthDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentHealthInformationHandler));
adminStudentUpdateRoute
    .route('/emergency-contact-detail/:id')
    .patch(validate(updateStudentEmergencyDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentEmergencyContactHandler));
adminStudentUpdateRoute.route('/password/:id').patch(validate(updateStudentPasswordSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentPasswordHandler));
export default adminStudentUpdateRoute;
