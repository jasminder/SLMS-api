import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createSchoolCheckInAttendanceForStudentSchema,
    fetchSchoolCheckInAttendanceSchema,
    markCheckInFalseForSelectedStudentsSchema,
    markCheckInTrueForSelectedStudentsSchema,
    markSchoolCheckInAttendanceForStudentSchema,
    markStudentAsNotCheckedInSchema
} from '../../../schema/admin.dto/admin.checkin.dto/admin.checkin.dto';
import {
    createSchoolCheckInAttendanceForStudentHandler,
    fetchSchoolCheckInAttendanceHandler,
    markCheckInFalseForSelectedStudentsHandler,
    markCheckInTrueForSelectedStudentsHandler,
    markSchoolCheckInAttendanceForStudentHandler,
    markStudentAsNotCheckedInHandler
} from '../../../controller/admin.controller/admin.checkin.controller/admin.checkin.controller';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminCheckinRoute = express.Router();
//create SchoolCheckInAttendance For Students for entire term
adminCheckinRoute
    .route('/create-daily-new-school-attendance-record')
    .post(validate(createSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createSchoolCheckInAttendanceForStudentHandler));


//fetch SchoolCheckInAttendance For Students for entire term
adminCheckinRoute.route('/fetch-daily-new-school-attendance-record').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchSchoolCheckInAttendanceHandler));

/*mark check in true for a single studentid*/
adminCheckinRoute
    .route('/checkin-true-single-student/:studentId')
    .patch(validate(markSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markSchoolCheckInAttendanceForStudentHandler));

/*mark the check-in as false for single student ID*/
adminCheckinRoute
    .route('/checkin-false-single-student/:studentId')
    .patch(validate(markStudentAsNotCheckedInSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markStudentAsNotCheckedInHandler));

/*mark the check-in as true for selected student IDs*/
adminCheckinRoute
    .route('/checkin-true-for-selected-students')
    .patch(validate(markCheckInTrueForSelectedStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markCheckInTrueForSelectedStudentsHandler));

/*mark the check-in as false for selected student IDs*/
adminCheckinRoute
    .route('/checkin-false-for-selected-students')
    .patch(validate(markCheckInFalseForSelectedStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markCheckInFalseForSelectedStudentsHandler));
export default adminCheckinRoute;
