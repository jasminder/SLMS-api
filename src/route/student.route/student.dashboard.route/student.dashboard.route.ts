import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    acknowledgeStudentNoticeSchema,
    findActiveStudentDetailsSchema,
    findStudentsByEmailSchema,
    getStudentNoticeSchema
} from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import {
    acknowledgeStudentNoticeHandler,
    findStudentDetailsByIdHandler,
    findStudentsByEmailHandler,
    getAllStudentPortalNoticesHandler,
    getStudentNoticePortalHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';

const studentDashboardRoute = express.Router();

studentDashboardRoute.route('/students-by-email/:email').get(validate(findStudentsByEmailSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentsByEmailHandler));
studentDashboardRoute.route('/student-detail/:studentId').get(validate(findActiveStudentDetailsSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentDetailsByIdHandler));
studentDashboardRoute.route('/get-all-student-portal-notices/:studentId').get(protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getAllStudentPortalNoticesHandler));

studentDashboardRoute
    .route('/student-portal-notice-detail/:noticeId')
    .get(validate(getStudentNoticeSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(getStudentNoticePortalHandler));
studentDashboardRoute
    .route('/acknowledge-student-portal-notice/:studentId/:studentNoticeId')
    .patch(validate(acknowledgeStudentNoticeSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(acknowledgeStudentNoticeHandler));

export default studentDashboardRoute;
