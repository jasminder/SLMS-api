import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createAutomatedMailForparentsHandler,
    createSkipReportHandler,
    fetchCheckedInStudentsWithAttendanceHandler,
    fetchSchooldayTypeHandler,
    findAutomatedMailHandler,
    getLastFiveClassAttendancesHandler,
    markStudentAsPresentHandler,
    undoMarkStudentAsPresentHandler
} from '../../../controller/teacher.controller/teacher.attendance.controller/teacher.attendance.controller';
import {
    createAutomatedMailForParentsSchema,
    createSkipReportSchema,
    fetchCheckedInStudentsWithAttendanceSchema,
    fetchSchooldayTypeSchema,
    findAutomatedMailSchema,
    getLastFiveClassAttendancesSchema,
    markStudentAsPresentSchema,
    undoMarkStudentAsPresentSchema
} from '../../../schema/teacher.dto/teacher.attendance.dto/teacher.attendance.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const teacherAttendanceRoute = express.Router();

/* fetching the check-in record for students who have checked in with default class-attendance */
teacherAttendanceRoute
    .route('/fetch-checkedin-students-for-attendance/:termSubjectLevelId/:sectionId')
    .get(validate(fetchCheckedInStudentsWithAttendanceSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(fetchCheckedInStudentsWithAttendanceHandler));
teacherAttendanceRoute
    .route('/fetch-schoolday-type/:termSubjectLevelId')
    .get(validate(fetchSchooldayTypeSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(fetchSchooldayTypeHandler));

/*mark presenttrue for a single studentid*/
teacherAttendanceRoute
    .route('/mark-single-student-as-present/:studentId/:classAttendanceId')
    .patch(validate(markStudentAsPresentSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(markStudentAsPresentHandler));

/* create student skip report*/
teacherAttendanceRoute
    .route('/create-skip-report-for-student/:studentId/:teacherId')
    .post(validate(createSkipReportSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(createSkipReportHandler));

/*fetch last 5 attendance for the students*/
teacherAttendanceRoute
    .route('/get-last-attendance/:studentId/:studentClassAssignmentId')
    .get(validate(getLastFiveClassAttendancesSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(getLastFiveClassAttendancesHandler));

/*create automated emails record for all students in the class*/
teacherAttendanceRoute
    .route('/create-automated-email-for-parents-in-class')
    .post(validate(createAutomatedMailForParentsSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(createAutomatedMailForparentsHandler));

/*get all automated emails for parenst for students in a class*/
teacherAttendanceRoute
    .route('/find-automated-email-for-parents-in-class')
    .get(validate(findAutomatedMailSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(findAutomatedMailHandler));

/*undo mark student as present*/
teacherAttendanceRoute
    .route('/undo-mark-student-as-present/:studentId/:classAttendanceId')
    .patch(validate(undoMarkStudentAsPresentSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(undoMarkStudentAsPresentHandler));

export default teacherAttendanceRoute;
