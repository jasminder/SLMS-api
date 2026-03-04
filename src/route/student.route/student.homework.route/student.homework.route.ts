import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import validate from '../../../middleware/validateResource';
import { fetchStudentHomeworkSchema, fetchStudentReportSchema } from '../../../schema/student.dto/student.dashboard.dto/student.homework.dto/student.homework.dto';
import { fetchStudentHomeworkHandler, fetchStudentReportHandler } from '../../../controller/student.controller/student.dashboard.controller/student.homework.controller/student.homework.controller';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

const studentHomeworkRoute = express.Router();
studentHomeworkRoute.route('/fetch-student-homework/:studentId/:termSubjectLevelId/:sectionId')
    .get(validate(fetchStudentHomeworkSchema), protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(fetchStudentHomeworkHandler));
studentHomeworkRoute.route('/fetch-student-report/:studentId')
    .get(validate(fetchStudentReportSchema), protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(fetchStudentReportHandler));

    export default studentHomeworkRoute;
