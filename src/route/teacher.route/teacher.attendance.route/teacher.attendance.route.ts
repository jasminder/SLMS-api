import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createAutomatedMailForparentsHandler,
    createSkipReportHandler,
    fetchCheckedInStudentsWithAttendanceHandler,
    findAutomatedMailHandler,
    getLastFiveClassAttendancesHandler,
    markStudentAsPresentHandler
} from '../../../controller/teacher.controller/teacher.attendance.controller/teacher.attendance.controller';
import {
    createAutomatedMailForParentsSchema,
    createSkipReportSchema,
    fetchCheckedInStudentsWithAttendanceSchema,
    findAutomatedMailSchema,
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

/*create automated emails record for all students in the class*/
teacherAttendanceRoute
    .route('/create-automated-email-for-parents-in-class')
    .post(validate(createAutomatedMailForParentsSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(createAutomatedMailForparentsHandler));

/*get all automated emails for parenst for students in a class*/
teacherAttendanceRoute.route('/find-automated-email-for-parents-in-class').get(validate(findAutomatedMailSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(findAutomatedMailHandler));
export default teacherAttendanceRoute;
