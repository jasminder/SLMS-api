import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { closeSkipReportTodayHandler, findSkipReportsForTodayHandler } from '../../../controller/admin.controller/admin.attendance.controller/admin.attendance.controller';
import { closeSkipReportTodaySchema } from '../../../schema/admin.dto/admin.attendance.dto/admin.attendance.dto';

const adminAttendanceRoute = express.Router();

/*get skip report if the the student has skipped a class */
adminAttendanceRoute.route('/find-skip-reports-for-today').get(asyncErrorHandler(findSkipReportsForTodayHandler));

// Function to mark a student as checked out in SchoolCheckInAttendance records
adminAttendanceRoute.route('/close-skip-report-today/:skipReportId/:adminId').patch(validate(closeSkipReportTodaySchema), asyncErrorHandler(closeSkipReportTodayHandler));

export default adminAttendanceRoute;
