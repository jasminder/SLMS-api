import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createEmailTemplateSchema,
    deleteEmailTemplateSchema,
    fetchEmailContentByDateSchema,
    updateEmailTemplateSchema
} from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import {
    createEmailTemplateHandler,
    deleteEmailTemplateHandler,
    fetchEmailContentByDateHandler,
    getAllEmailTemplatesHandler,
    updateEmailTemplateHandler
} from '../../../controller/admin.controller/admin.communication.controller/admin.communication.controller';
// Assuming you have a router set up as adminEmailTemplateRoute
const adminEmailTemplateRoute = express.Router();

adminEmailTemplateRoute.route('/create-email-template/:adminId').post(validate(createEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createEmailTemplateHandler));
adminEmailTemplateRoute.route('/update-email-template/:templateId').patch(validate(updateEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateEmailTemplateHandler));
adminEmailTemplateRoute.route('/get-email-templates').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllEmailTemplatesHandler));
adminEmailTemplateRoute.route('/delete-email-template/:templateId').delete(validate(deleteEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteEmailTemplateHandler));
adminEmailTemplateRoute.route('/email-content-by-date/:date').get(validate(fetchEmailContentByDateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchEmailContentByDateHandler));
export default adminEmailTemplateRoute;
