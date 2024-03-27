import express from 'express';

import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import { createWeekdaySchoolCheckInAttendanceForStudentSchema } from '../../../../schema/admin.dto/admin.checkin.dto/admin.weekday.checkin.dto/admin.weekday.checkin.dto';
import { createWeekdaySchoolCheckInAttendanceForStudentHandler } from '../../../../controller/admin.controller/admin.checkin.controller/admin.weekday.checkin.controller/admin.weekday.checkin.controller';
import validate from '../../../../middleware/validateResource';

const adminTeacherWeekdayCheckinRoute = express.Router();
//create SchoolCheckInAttendance For Students for entire term
adminTeacherWeekdayCheckinRoute
    .route('/create-new-school-attendance-record')
    .post(validate(createWeekdaySchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createWeekdaySchoolCheckInAttendanceForStudentHandler));

export default adminTeacherWeekdayCheckinRoute;
