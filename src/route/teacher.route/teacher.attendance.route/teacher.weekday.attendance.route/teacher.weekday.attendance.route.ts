import express from 'express';
import validate from '../../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';
import {
    markWeekdayStudentAsPresentHandler,
    undoMarkWeekdayStudentAsPresentHandler
} from '../../../../controller/teacher.controller/teacher.attendance.controller/teacher.weekday.attendance.controller/teacher.weekday.attendance.controller';
import {
    markWeekdayStudentAsPresentSchema,
    undoWeekdayStudentAsPresentSchema
} from '../../../../schema/teacher.dto/teacher.attendance.dto/teacher.weekday.attendance.dto/teacher.weekday.attendance.dto';
const teacherWeekdayAttendanceRoute = express.Router();
teacherWeekdayAttendanceRoute
    .route('/checkin-present-single-student/:studentId/:studentClassAssignmentId')
    .patch(validate(markWeekdayStudentAsPresentSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(markWeekdayStudentAsPresentHandler));

/*undo checkin for a student*/
teacherWeekdayAttendanceRoute
    .route('/undo-checkin-present-single-student/:studentId/:studentClassAssignmentId')
    .patch(validate(undoWeekdayStudentAsPresentSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(undoMarkWeekdayStudentAsPresentHandler));
export default teacherWeekdayAttendanceRoute;
