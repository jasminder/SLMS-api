import express from 'express';
import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import {
    acknowledgeDirectDebitChargeHandler,
    addFamilyAccessHandler,
    adminMandateActionHandler,
    getDirectDebitSettingsHandler,
    listDirectDebitEmailsHandler,
    previewDirectDebitEmailHandler,
    resetDirectDebitEmailHandler,
    saveDirectDebitEmailHandler,
    sendTestDirectDebitEmailHandler,
    listDirectDebitChargesHandler,
    listDirectDebitFamiliesHandler,
    listFamilyAccessHandler,
    removeFamilyAccessHandler,
    runDirectDebitNowHandler,
    searchDirectDebitFamiliesHandler,
    updateDirectDebitSettingsHandler,
    cancelMyDirectDebitHandler,
    createDirectDebitSetupHandler,
    getMyDirectDebitHandler,
    getStudentDirectDebitHandler,
    listDirectDebitAttentionHandler
} from '../../controller/directDebit.controller/directDebit.controller';
import {
    accessIdParamSchema,
    addFamilyAccessSchema,
    adminMandateActionSchema,
    chargeIdParamSchema,
    createSetupSessionSchema,
    directDebitEmailKeySchema,
    previewDirectDebitEmailSchema,
    saveDirectDebitEmailSchema,
    familySearchSchema,
    studentIdParamSchema,
    updateDirectDebitSettingsSchema
} from '../../schema/directDebit.dto/directDebit.dto';

// Mounted at /api/v1/student-portal-direct-debit (web portal + Flutter app). The mandate belongs to the logged-in family login.
export const studentDirectDebitRoute = express.Router();
studentDirectDebitRoute.route('/').get(protectRoute, restrict('STUDENT'), asyncErrorHandler(getMyDirectDebitHandler));
studentDirectDebitRoute.route('/setup-session').post(validate(createSetupSessionSchema), protectRoute, restrict('STUDENT'), asyncErrorHandler(createDirectDebitSetupHandler));
studentDirectDebitRoute.route('/cancel').post(protectRoute, restrict('STUDENT'), asyncErrorHandler(cancelMyDirectDebitHandler));

// Mounted at /api/v1/admin/direct-debit
export const adminDirectDebitRoute = express.Router();
adminDirectDebitRoute.route('/attention').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(listDirectDebitAttentionHandler));
adminDirectDebitRoute.route('/attention/:chargeId/acknowledge').post(validate(chargeIdParamSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(acknowledgeDirectDebitChargeHandler));
adminDirectDebitRoute.route('/student/:studentId').get(validate(studentIdParamSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(getStudentDirectDebitHandler));
adminDirectDebitRoute.route('/mandate/:mandateId/action').post(validate(adminMandateActionSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(adminMandateActionHandler));

// Administration > Direct Debit
const admin = [protectRoute, restrict('ADMIN')];
adminDirectDebitRoute.route('/settings').get(...admin, asyncErrorHandler(getDirectDebitSettingsHandler));
adminDirectDebitRoute.route('/settings').put(validate(updateDirectDebitSettingsSchema), ...admin, asyncErrorHandler(updateDirectDebitSettingsHandler));
adminDirectDebitRoute.route('/families').get(...admin, asyncErrorHandler(listDirectDebitFamiliesHandler));
adminDirectDebitRoute.route('/family-search').get(validate(familySearchSchema), ...admin, asyncErrorHandler(searchDirectDebitFamiliesHandler));
adminDirectDebitRoute.route('/access').get(...admin, asyncErrorHandler(listFamilyAccessHandler));
adminDirectDebitRoute.route('/access').post(validate(addFamilyAccessSchema), ...admin, asyncErrorHandler(addFamilyAccessHandler));
adminDirectDebitRoute.route('/access/:id').delete(validate(accessIdParamSchema), ...admin, asyncErrorHandler(removeFamilyAccessHandler));
adminDirectDebitRoute.route('/charges').get(...admin, asyncErrorHandler(listDirectDebitChargesHandler));
adminDirectDebitRoute.route('/run-now').post(...admin, asyncErrorHandler(runDirectDebitNowHandler));
adminDirectDebitRoute.route('/emails').get(...admin, asyncErrorHandler(listDirectDebitEmailsHandler));
adminDirectDebitRoute.route('/emails/:key').put(validate(saveDirectDebitEmailSchema), ...admin, asyncErrorHandler(saveDirectDebitEmailHandler));
adminDirectDebitRoute.route('/emails/:key/reset').post(validate(directDebitEmailKeySchema), ...admin, asyncErrorHandler(resetDirectDebitEmailHandler));
adminDirectDebitRoute.route('/emails/:key/preview').post(validate(previewDirectDebitEmailSchema), ...admin, asyncErrorHandler(previewDirectDebitEmailHandler));
adminDirectDebitRoute.route('/emails/:key/test').post(validate(previewDirectDebitEmailSchema), ...admin, asyncErrorHandler(sendTestDirectDebitEmailHandler));
