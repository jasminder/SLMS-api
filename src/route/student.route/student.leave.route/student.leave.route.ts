import express from 'express';

import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import validate from '../../../middleware/validateResource';
import { restrict } from '../../../middleware/restrict';
import { protectRoute } from '../../../middleware/protectRoutes';
import { createLeaveApplicationByStudentHandler, fetchLeavesForStudentPortalHandler } from '../../../controller/student.controller/student.dashboard.controller/student.leave.controller/student.leave.controller';
import { createLeaveApplicationByStudentSchema, fetchLeavesForStudentPortalSchema } from '../../../schema/student.dto/student.dashboard.dto/student.leave.dto/student.leave.dto';
const studentLeaveRoute = express.Router();
studentLeaveRoute
    .route('/create-leave-application/:studentId/:appliedById/:appliedByRole')
    .post(validate(createLeaveApplicationByStudentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(createLeaveApplicationByStudentHandler));

    studentLeaveRoute.route('/get-all-leaves/:studentId').get(validate(fetchLeavesForStudentPortalSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(fetchLeavesForStudentPortalHandler));

export default studentLeaveRoute;
