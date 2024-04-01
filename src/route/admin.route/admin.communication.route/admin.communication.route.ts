import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { createEmailTemplateSchema } from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import { createEmailTemplateHandler } from '../../../controller/admin.controller/admin.communication.controller/admin.communication.controller';
// Assuming you have a router set up as adminEmailTemplateRoute
const adminEmailTemplateRoute = express.Router();

adminEmailTemplateRoute.route('/create-email-template/:adminId').post(validate(createEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createEmailTemplateHandler));

export default adminEmailTemplateRoute;
