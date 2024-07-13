import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    fetchActiveCheckedInStudentsSchema,
    fetchCheckedOutStudentsSchema,
    fetchStudentsOnAbsentSchema,
    fetchStudentsOnAttendanceSchema,
    fetchStudentsOnLeaveSchema,
    findAllActiveStudentsWithFlagsSchema,
    searchActiveStudentsWithFlagsSchema
} from '../../../schema/admin.dto/admin.dashboard.dto/admin.dashboard.dto';
import {
    fetchActiveCheckedInStudentsHandler,
    fetchCheckedOutStudentsHandler,
    fetchPendingLeavesHandler,
    fetchStudentsOnAbsentHandler,
    fetchStudentsOnAttendanceHandler,
    fetchStudentsOnLeaveHandler,
    fetchUnviewedApplicantsHandler,
    fetchWeekdayActiveCheckedInStudentsHandler,
    findActiveStudentsWithFlagsHandler,
    searchActiveStudentsWithFlagsHandler
} from '../../../controller/admin.controller/admin.dashboard.controller/admin.dashboard.controller';

const adminDashboardRoute = express.Router();

adminDashboardRoute
    .route('/fetch-active-checked-in-students')
    .get(validate(fetchActiveCheckedInStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchActiveCheckedInStudentsHandler));
adminDashboardRoute.route('/fetch-active-checked-out-students').get(validate(fetchCheckedOutStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchCheckedOutStudentsHandler));
adminDashboardRoute.route('/fetch-students-on-leave').get(validate(fetchStudentsOnLeaveSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnLeaveHandler));
adminDashboardRoute.route('/fetch-students-on-absent').get(validate(fetchStudentsOnAbsentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnAbsentHandler));
adminDashboardRoute.route('/fetch-students-on-attendance').get(validate(fetchStudentsOnAttendanceSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchStudentsOnAttendanceHandler));
adminDashboardRoute
    .route('/student/active/get-all-active-students-with-flags')
    .get(validate(findAllActiveStudentsWithFlagsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsWithFlagsHandler));
adminDashboardRoute
    .route('/student/active/search-active-students-with-flags')
    .get(validate(searchActiveStudentsWithFlagsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsWithFlagsHandler));
adminDashboardRoute
    .route('/fetch-weekday-active-checked-in-students')
    .get(validate(fetchActiveCheckedInStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchWeekdayActiveCheckedInStudentsHandler));
adminDashboardRoute.route('/new-students-leaves/pending').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchPendingLeavesHandler));
adminDashboardRoute.route('/applicants/unviewed').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchUnviewedApplicantsHandler));

export default adminDashboardRoute;
