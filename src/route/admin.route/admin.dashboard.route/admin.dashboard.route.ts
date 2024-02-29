import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { fetchActiveCheckedInStudentsSchema, fetchCheckedOutStudentsSchema, fetchStudentsOnAbsentSchema, fetchStudentsOnAttendanceSchema, fetchStudentsOnLeaveSchema } from '../../../schema/admin.dto/admin.dashboard.dto/admin.dashboard.dto';
import { fetchActiveCheckedInStudentsHandler, fetchCheckedOutStudentsHandler, fetchStudentsOnAbsentHandler, fetchStudentsOnAttendanceHandler, fetchStudentsOnLeaveHandler } from '../../../controller/admin.controller/admin.dashboard.controller/admin.dashboard.controller';


const adminDashboardRoute = express.Router();

adminDashboardRoute.route('/fetch-active-checked-in-students').get(validate(fetchActiveCheckedInStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchActiveCheckedInStudentsHandler));
adminDashboardRoute.route('/fetch-active-checked-out-students').get(validate(fetchCheckedOutStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchCheckedOutStudentsHandler));
adminDashboardRoute.route('/fetch-students-on-leave').get(validate(fetchStudentsOnLeaveSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnLeaveHandler));
adminDashboardRoute.route('/fetch-students-on-absent').get(validate(fetchStudentsOnAbsentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnAbsentHandler));
adminDashboardRoute.route('/fetch-students-on-attendance').get(validate(fetchStudentsOnAttendanceSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnAttendanceHandler));

export default adminDashboardRoute;
