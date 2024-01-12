import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { findTeacherByIdForTeacherHandler } from '../../controller/teacher.controller/teacher.controller';
import { findTeacherByIdSchema } from '../../schema/teacher.dto/teacher.dto';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const teacherRoute = express.Router();
/* find unique applicant by id*/
teacherRoute.route('/teacher-detail/:id').get(validate(findTeacherByIdSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(findTeacherByIdForTeacherHandler));

export default teacherRoute;
