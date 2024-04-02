import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { createNoticeSchema, deleteNoticeSchema, getUnseenNoticesSchema } from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';
import { createNoticeHandler, deleteNoticeHandler, getAllNoticesHandler, getUnseenNoticesHandler } from '../../../controller/admin.controller/admin.notice.controller/admin.notice.controller';

const adminNoticeRoute = express.Router();

adminNoticeRoute.route('/create-notice').post(validate(createNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createNoticeHandler));
adminNoticeRoute.route('/get-all-notices').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllNoticesHandler));
adminNoticeRoute.route('/delete-notice/:id').delete(validate(deleteNoticeSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteNoticeHandler));
adminNoticeRoute.route('/unseen-notices-for-teacher/:teacherId').get(validate(getUnseenNoticesSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getUnseenNoticesHandler));

export default adminNoticeRoute;
