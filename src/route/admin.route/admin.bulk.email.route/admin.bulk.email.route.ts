import express from 'express';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { getBulkEmailHandler, listBulkEmailsHandler, previewBulkEmailHandler, sendBulkEmailHandler, sendTestBulkEmailHandler } from '../../../controller/admin.controller/admin.bulk.email.controller/admin.bulk.email.controller';

/* Scope of Work item 35: email to a selected group of students. ADMIN only. */
const adminBulkEmailRoute = express.Router();

adminBulkEmailRoute.route('/preview').post(protectRoute, restrict('ADMIN'), asyncErrorHandler(previewBulkEmailHandler));
adminBulkEmailRoute.route('/test').post(protectRoute, restrict('ADMIN'), asyncErrorHandler(sendTestBulkEmailHandler));
adminBulkEmailRoute.route('/send').post(protectRoute, restrict('ADMIN'), asyncErrorHandler(sendBulkEmailHandler));
adminBulkEmailRoute.route('/').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(listBulkEmailsHandler));
adminBulkEmailRoute.route('/:id').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getBulkEmailHandler));

export default adminBulkEmailRoute;
