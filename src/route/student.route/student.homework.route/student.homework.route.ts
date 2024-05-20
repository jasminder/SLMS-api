import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import validate from '../../../middleware/validateResource';
import { fetchStudentHomeworkSchema } from '../../../schema/student.dto/student.dashboard.dto/student.homework.dto/student.homework.dto';
import { fetchStudentHomeworkHandler } from '../../../controller/student.controller/student.dashboard.controller/student.homework.controller/student.homework.controller';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

const studentHomeworkRoute = express.Router();
studentHomeworkRoute.route('/fetch-student-homework/:studentId/:termSubjectLevelId/:sectionId')
    .get(validate(fetchStudentHomeworkSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(fetchStudentHomeworkHandler));

    export default studentHomeworkRoute;
