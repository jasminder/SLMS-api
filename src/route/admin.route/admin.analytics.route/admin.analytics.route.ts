import express from 'express';

import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    getActiveStudentsPerSubjectHandler,
    getExpectedStudentCountPerWeekdayHandler,
    getGenderDistributionForCurrentTermHandler,
    getPresentAttendanceHandler,
    getStudentsPerTermHandler,
    getWeekdayPresentAttendancesHandler
} from '../../../controller/admin.controller/admin.analytics.controller/admin.analytics.controller';

const adminAnalyticsRoute = express.Router();

adminAnalyticsRoute.route('/get-active-students-per-subject').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getActiveStudentsPerSubjectHandler));
adminAnalyticsRoute.route('/get-present-attendance').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getPresentAttendanceHandler));
adminAnalyticsRoute.route('/get-expected-per-weekday').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getExpectedStudentCountPerWeekdayHandler));
adminAnalyticsRoute.route('/get-weekday-present-attendance').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getWeekdayPresentAttendancesHandler));

adminAnalyticsRoute.route('/students-per-term').get(protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getStudentsPerTermHandler));
adminAnalyticsRoute.route('/gender-distribution-current-term').get(protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getGenderDistributionForCurrentTermHandler));

export default adminAnalyticsRoute;
