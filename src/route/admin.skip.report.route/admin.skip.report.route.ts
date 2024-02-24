import express from 'express';
import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import {
    closeSkipReportSchema,
    createSkipReportSchema,
    findAllSkipReportsSchema,
    getSkipReportsSchema,
    updateSkipReportReasonSchema
} from '../../schema/admin.dto/admin.skip.report.dto/admin.skip.report.dto';
import {
    closeSkipReportHandler,
    createSkipReportHandler,
    findAllSkipReportsHandler,
    getSkipReportsHandler,
    updateSkipReportReasonHandler
} from '../../controller/admin.skip.report.controller/admin.skip.report.controller';

const skipReportRoute = express.Router();

skipReportRoute.route('/get/:studentId').get(validate(getSkipReportsSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(getSkipReportsHandler));
skipReportRoute.route('/create-for-student/:studentId/:adminId').post(validate(createSkipReportSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createSkipReportHandler));
skipReportRoute.route('/update-reason/:skipReportId').patch(validate(updateSkipReportReasonSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(updateSkipReportReasonHandler));
skipReportRoute.route('/close/:skipReportId').patch(validate(closeSkipReportSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(closeSkipReportHandler));
skipReportRoute.route('/find-all').get(validate(findAllSkipReportsSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findAllSkipReportsHandler));
export default skipReportRoute;
