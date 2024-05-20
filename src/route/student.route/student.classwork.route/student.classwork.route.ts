import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import validate from '../../../middleware/validateResource';
import { fetchStudentHomeworkSchema } from '../../../schema/student.dto/student.dashboard.dto/student.homework.dto/student.homework.dto';
import { fetchStudentHomeworkHandler } from '../../../controller/student.controller/student.dashboard.controller/student.homework.controller/student.homework.controller';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { fetchStudentClassworkSchema } from '../../../schema/student.dto/student.classwork.dto/student.classwork.dto';
import { fetchStudentClassworkHandler } from '../../../controller/student.controller/student.classwork.controller/student.classwork.controller';

const studentClassworkRoute = express.Router();
// Assuming Express.js routing
studentClassworkRoute.route('/fetch-student-classwork/:studentId/:termSubjectLevelId/:sectionId')
    .get(validate(fetchStudentClassworkSchema), protectRoute, restrict('ADMIN', 'TEACHER','STUDENT'), asyncErrorHandler(fetchStudentClassworkHandler));

    export default studentClassworkRoute;
