import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createNoticeSchema,
    deleteNoticeSchema,
    getNoticeSchema,
    getUnseenNoticesSchema,
    resetNoticeViewsSchema,
    updateNoticeSchema
} from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';
import {
    acknowledgeNoticeHandler,
    createNoticeHandler,
    createStudentNoticeHandler,
    deleteNoticeHandler,
    deleteStudentNoticeHandler,
    getAllNoticesHandler,
    getNoticeHandler,
    getStudentNoticeHandler,
    getUnseenNoticesHandler,
    resetNoticeViewsHandler,
    updateNoticeHandler,
    updateStudentNoticeHandler
} from '../../../controller/admin.controller/admin.notice.controller/admin.notice.controller';

const adminNoticeRoute = express.Router();
// Teacher notice
adminNoticeRoute.route('/create/:adminId').post(validate(createNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createNoticeHandler));
adminNoticeRoute.route('/get-all-notices').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllNoticesHandler));
adminNoticeRoute.route('/delete-notice/:noticeId').delete(validate(deleteNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteNoticeHandler));
adminNoticeRoute.route('/unseen-notices-for-teacher/:teacherId').get(validate(getUnseenNoticesSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getUnseenNoticesHandler));
adminNoticeRoute.route('/notice/acknowledge/:noticeId/:teacherId').patch(protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(acknowledgeNoticeHandler));

adminNoticeRoute.route('/notice-detail/:noticeId').get(validate(getNoticeSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getNoticeHandler));
adminNoticeRoute.route('/update-notice/:noticeId').patch(validate(updateNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateNoticeHandler));
adminNoticeRoute.route('/reset-notice-views/:noticeId').patch(validate(resetNoticeViewsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(resetNoticeViewsHandler));
// Student notice
adminNoticeRoute.route('/create/student/:adminId').post(validate(createNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createStudentNoticeHandler));
adminNoticeRoute.route('/get-all-student-notices').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllNoticesHandler));
adminNoticeRoute.route('/delete-student-notice/:noticeId').delete(validate(deleteNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteStudentNoticeHandler));
adminNoticeRoute.route('/student-notice-detail/:noticeId').get(validate(getNoticeSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getStudentNoticeHandler));
adminNoticeRoute.route('/update-student-notice/:noticeId').patch(validate(updateNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentNoticeHandler));

export default adminNoticeRoute;
