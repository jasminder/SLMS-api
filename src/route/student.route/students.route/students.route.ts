import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { getStudentsForAppHandler } from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';

const studentsRoute = express.Router();

studentsRoute
    .route('/')
    .get(protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(getStudentsForAppHandler));

export default studentsRoute;
