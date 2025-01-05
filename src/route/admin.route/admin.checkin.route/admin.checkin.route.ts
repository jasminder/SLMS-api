import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createSchoolCheckInAttendanceForStudentSchema,
    fetchSchoolCheckInAttendanceSchema,
    markCheckInFalseForSelectedStudentsSchema,
    markCheckInTrueForSelectedStudentsSchema,
    markSchoolCheckInAttendanceForStudentSchema,
    markStudentAsNotCheckedInSchema,
    toggleAutomatedAttendanceSchema,
    undoCheckInSchema,
    undoFalseCheckinSchema,
    undoSchoolCheckInAttendanceForStudentByIdSchema
} from '../../../schema/admin.dto/admin.checkin.dto/admin.checkin.dto';
import {
    createSchoolCheckInAttendanceForStudentHandler,
    fetchSchoolCheckInAttendanceHandler,
    markCheckInFalseForSelectedStudentsHandler,
    markCheckInTrueForSelectedStudentsHandler,
    markSchoolCheckInAttendanceForStudentHandler,
    markStudentAsNotCheckedInHandler,
    toggleAutomatedAttendanceHandler,
    undoCheckInHandler,
    undoFalseCheckinHandler,
    undoSchoolCheckInAttendanceForStudentByIdHandler,
    undoSchoolCheckInAttendanceForStudentHandler
} from '../../../controller/admin.controller/admin.checkin.controller/admin.checkin.controller';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminCheckinRoute = express.Router();
//create SchoolCheckInAttendance For Students for entire term
adminCheckinRoute
    .route('/create-daily-new-school-attendance-record')
    .post(validate(createSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createSchoolCheckInAttendanceForStudentHandler));

adminCheckinRoute.route('/undo-school-attendance-record').post(protectRoute, restrict('ADMIN'), asyncErrorHandler(undoSchoolCheckInAttendanceForStudentHandler));

//fetch SchoolCheckInAttendance For Students for entire term
adminCheckinRoute.route('/fetch-daily-new-school-attendance-record').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchSchoolCheckInAttendanceHandler));

/*mark check in true for a single studentid*/
adminCheckinRoute
    .route('/checkin-true-single-student/:studentId')
    .patch(validate(markSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markSchoolCheckInAttendanceForStudentHandler));

/*undo checkin for a student*/
adminCheckinRoute.route('/undo-checkin/:studentId').patch(validate(undoCheckInSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(undoCheckInHandler));

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

/*undo false check in*/
adminCheckinRoute.route('/undo-false-checkin/:studentId').patch(validate(undoFalseCheckinSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(undoFalseCheckinHandler));

//undo creation of school checkin and class atendance by student id and date
adminCheckinRoute.route('/undo-school-attendance-record-by-studentId').post(validate(undoSchoolCheckInAttendanceForStudentByIdSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(undoSchoolCheckInAttendanceForStudentByIdHandler));

//toggle automated attendance
adminCheckinRoute.route('/toggle-automated-attendance').post(validate(toggleAutomatedAttendanceSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(toggleAutomatedAttendanceHandler));
export default adminCheckinRoute;

