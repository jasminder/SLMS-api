import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { findStudentsByEmailSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import { findStudentsByEmailHandler } from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';

const studentDashboardRoute = express.Router();

studentDashboardRoute.route('/students-by-email/:email').get(validate(findStudentsByEmailSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findStudentsByEmailHandler));

export default studentDashboardRoute;
