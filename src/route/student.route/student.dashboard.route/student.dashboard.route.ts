import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { findActiveStudentDetailsSchema, findStudentsByEmailSchema, getStudentNoticeSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import {
    findStudentDetailsByIdHandler,
    findStudentsByEmailHandler,
    getAllStudentPortalNoticesHandler,
    getStudentNoticePortalHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';

const studentDashboardRoute = express.Router();

studentDashboardRoute.route('/students-by-email/:email').get(validate(findStudentsByEmailSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentsByEmailHandler));
studentDashboardRoute.route('/student-detail/:studentId').get(validate(findActiveStudentDetailsSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentDetailsByIdHandler));
studentDashboardRoute.route('/get-all-student-portal-notices').get(protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getAllStudentPortalNoticesHandler));

studentDashboardRoute
    .route('/student-portal-notice-detail/:noticeId')
    .get(validate(getStudentNoticeSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(getStudentNoticePortalHandler));
export default studentDashboardRoute;
