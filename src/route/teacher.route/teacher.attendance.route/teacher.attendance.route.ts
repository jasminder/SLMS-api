import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { createSkipReportHandler, fetchCheckedInStudentsWithAttendanceHandler, markStudentAsPresentHandler } from '../../../controller/teacher.controller/teacher.attendance.controller/teacher.attendance.controller';
import { createSkipReportSchema, fetchCheckedInStudentsWithAttendanceSchema, markStudentAsPresentSchema } from '../../../schema/teacher.dto/teacher.attendance.dto/teacher.attendance.dto';

const teacherAttendanceRoute = express.Router();


/* fetching the check-in record for students who have checked in with default class-attendance */
teacherAttendanceRoute.route('/fetch-checkedin-students-for-attendance/:termSubjectLevelId/:sectionName').post( validate(fetchCheckedInStudentsWithAttendanceSchema),asyncErrorHandler(fetchCheckedInStudentsWithAttendanceHandler));

/*mark presenttrue for a single studentid*/
teacherAttendanceRoute.route('/mark-single-student-as-present/:studentId/:studentClassAssignmentId').patch(validate(markStudentAsPresentSchema), asyncErrorHandler(markStudentAsPresentHandler));

/* create student skip report*/
teacherAttendanceRoute.route('/create-skip-report-for-student/:studentId/:teacherId').post(validate(createSkipReportSchema), asyncErrorHandler(createSkipReportHandler));


export default teacherAttendanceRoute;