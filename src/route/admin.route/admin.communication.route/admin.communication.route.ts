import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createEmailTemplateSchema,
    createEnrollmentConfirmationEmailTemplateSchema,
    deleteEmailTemplateSchema,
    deleteEnrollmentConfirmationEmailTemplateSchema,
    fetchEmailContentByDateSchema,
    updateEmailTemplateSchema,
    updateEnrollmentConfirmationEmailTemplateSchema
} from '../../../schema/admin.dto/admin.communication.dto/admin.communication.dto';
import {
    createEmailTemplateHandler,
    createEnrollmentConfirmationEmailTemplateHandler,
    deleteEmailTemplateHandler,
    deleteEnrollmentConfirmationEmailTemplateHandler,
    fetchEmailContentByDateHandler,
    getAllEmailTemplatesHandler,
    getFirstEnrollmentConfirmationEmailTemplateHandler,
    updateEmailTemplateHandler,
    updateEnrollmentConfirmationEmailTemplateHandler
} from '../../../controller/admin.controller/admin.communication.controller/admin.communication.controller';

const adminEmailTemplateRoute = express.Router();
//sending application submission-confirmation mail
adminEmailTemplateRoute.route('/create-email-template/:adminId').post(validate(createEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createEmailTemplateHandler));
adminEmailTemplateRoute.route('/update-email-template/:templateId').patch(validate(updateEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateEmailTemplateHandler));
adminEmailTemplateRoute.route('/get-email-templates').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllEmailTemplatesHandler));
adminEmailTemplateRoute.route('/delete-email-template/:templateId').delete(validate(deleteEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteEmailTemplateHandler));
adminEmailTemplateRoute.route('/email-content-by-date/:date').get(validate(fetchEmailContentByDateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchEmailContentByDateHandler));
// sending enrollment confirmation mail
adminEmailTemplateRoute
    .route('/create-enrollment-confirmation-email-template/:adminId')
    .post(validate(createEnrollmentConfirmationEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createEnrollmentConfirmationEmailTemplateHandler));
adminEmailTemplateRoute
    .route('/update-enrollment-confirmation-email-template/:templateId')
    .put(validate(updateEnrollmentConfirmationEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateEnrollmentConfirmationEmailTemplateHandler));
adminEmailTemplateRoute
    .route('/delete-enrollment-confirmation-email-template/:templateId')
    .delete(validate(deleteEnrollmentConfirmationEmailTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteEnrollmentConfirmationEmailTemplateHandler));
adminEmailTemplateRoute.route('/get-first-enrollment-confirmation-email-template').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getFirstEnrollmentConfirmationEmailTemplateHandler));

export default adminEmailTemplateRoute;
