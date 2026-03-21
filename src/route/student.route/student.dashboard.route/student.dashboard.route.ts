import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    acknowledgeStudentNoticeSchema,
    fetchStudentAssignmentsSchema,
    findActiveStudentDetailsSchema,
    findStudentsByEmailSchema,
    getStudentNoticeSchema,
    getStudentNotificationsSchema,
    teacherAssignmentSchema,
    upsertDeviceTokenSchema,
    updateNotificationSchema
} from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import {
    acknowledgeStudentNoticeHandler,
    fetchStudentAssignmentsHandler,
    findStudentDetailsByIdHandler,
    findStudentsByEmailHandler,
    getAllStudentPortalNoticesHandler,
    getAllUnreadStudentNotificationsHandler,
    getStudentNoticePortalHandler,
    getTeacherAssignmentHandler,
    markNotificationAsReadHandler,
    upsertDeviceTokenHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';

const studentDashboardRoute = express.Router();

studentDashboardRoute.route('/students-by-email/:email').get(validate(findStudentsByEmailSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentsByEmailHandler));
studentDashboardRoute.route('/student-detail/:studentId').get(validate(findActiveStudentDetailsSchema), protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(findStudentDetailsByIdHandler));
studentDashboardRoute.route('/get-all-student-portal-notices/:studentId').get(protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getAllStudentPortalNoticesHandler));

studentDashboardRoute
    .route('/student-portal-notice-detail/:noticeId')
    .get(validate(getStudentNoticeSchema), protectRoute, restrict('STUDENT', 'ADMIN'), asyncErrorHandler(getStudentNoticePortalHandler));
studentDashboardRoute
    .route('/acknowledge-student-portal-notice/:studentId/:studentNoticeId')
    .patch(validate(acknowledgeStudentNoticeSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(acknowledgeStudentNoticeHandler));

// Assuming Express.js routing
studentDashboardRoute
    .route('/fetch-student-assignments/:studentId')
    .get(validate(fetchStudentAssignmentsSchema), protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(fetchStudentAssignmentsHandler));

studentDashboardRoute.route('/find-teacher/:termSubjectLevelId/:sectionId').get(validate(teacherAssignmentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), getTeacherAssignmentHandler);

studentDashboardRoute
    .route('/student-notifications/:studentId')
    .get(validate(getStudentNotificationsSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getAllUnreadStudentNotificationsHandler));
studentDashboardRoute
    .route('/notifications/read/:notificationId')
    .patch(validate(updateNotificationSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(markNotificationAsReadHandler));
studentDashboardRoute
    .route('/notifications/device-token')
    .post(validate(upsertDeviceTokenSchema), protectRoute, asyncErrorHandler(upsertDeviceTokenHandler));

export default studentDashboardRoute;
