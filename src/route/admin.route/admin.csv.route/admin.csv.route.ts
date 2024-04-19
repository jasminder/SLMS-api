import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { downloadStudentCsvHandler, downloadTeacherCsvHandler } from '../../../controller/admin.controller/admin.csv.controller/admin.csv.controller';

const adminCSVRouter = express.Router();

adminCSVRouter.route('/download-students-csv').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(downloadStudentCsvHandler));
adminCSVRouter.route('/download-teachers-csv').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(downloadTeacherCsvHandler));
export default adminCSVRouter;
