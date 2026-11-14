import express from 'express';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { addReleaseHandler, getInstallReportHandler, getNotInstalledHandler, getStudentAppRecordHandler, listReleasesHandler } from '../../../controller/admin.controller/admin.app.install.controller/admin.app.install.controller';

/* Scope of Work item 25: who has the app. ADMIN only. */
const adminAppInstallRoute = express.Router();

adminAppInstallRoute.route('/report').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getInstallReportHandler));
adminAppInstallRoute.route('/not-installed').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getNotInstalledHandler));
adminAppInstallRoute.route('/student/:studentId').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getStudentAppRecordHandler));
adminAppInstallRoute.route('/releases').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(listReleasesHandler)).post(protectRoute, restrict('ADMIN'), asyncErrorHandler(addReleaseHandler));

export default adminAppInstallRoute;
