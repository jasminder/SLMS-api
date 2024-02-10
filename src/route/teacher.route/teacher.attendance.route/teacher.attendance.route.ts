import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createSkipReportHandler,
    fetchCheckedInStudentsWithAttendanceHandler,
    getLastFiveClassAttendancesHandler,
    markStudentAsPresentHandler
} from '../../../controller/teacher.controller/teacher.attendance.controller/teacher.attendance.controller';
import {
    createSkipReportSchema,
    fetchCheckedInStudentsWithAttendanceSchema,
    getLastFiveClassAttendancesSchema,
    markStudentAsPresentSchema
} from '../../../schema/teacher.dto/teacher.attendance.dto/teacher.attendance.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const teacherAttendanceRoute = express.Router();

/* fetching the check-in record for students who have checked in with default class-attendance */
teacherAttendanceRoute
    .route('/fetch-checkedin-students-for-attendance/:termSubjectLevelId/:sectionName')
    .get(validate(fetchCheckedInStudentsWithAttendanceSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(fetchCheckedInStudentsWithAttendanceHandler));

/*mark presenttrue for a single studentid*/
teacherAttendanceRoute
    .route('/mark-single-student-as-present/:studentId/:studentClassAssignmentId')
    .patch(validate(markStudentAsPresentSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(markStudentAsPresentHandler));

/* create student skip report*/
teacherAttendanceRoute
    .route('/create-skip-report-for-student/:studentId/:teacherId')
    .post(validate(createSkipReportSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(createSkipReportHandler));

/*fetch last 5 attendance for the students*/
teacherAttendanceRoute
    .route('/get-last-attendance/:studentId/:studentClassAssignmentId')
    .get(validate(getLastFiveClassAttendancesSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(getLastFiveClassAttendancesHandler));
export default teacherAttendanceRoute;
