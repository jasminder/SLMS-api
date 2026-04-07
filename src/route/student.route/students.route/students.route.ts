import express from 'express';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import validate from '../../../middleware/validateResource';
import {
    getStudentsForAppHandler,
    updateStudentProfileForAppHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';
import { updateStudentProfileForAppSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';

const studentsRoute = express.Router();

studentsRoute
    .route('/')
    .get(protectRoute, restrict('ADMIN', 'STUDENT', 'PARENT'), asyncErrorHandler(getStudentsForAppHandler));

studentsRoute
    .route('/profile/:studentId')
    .patch(
        validate(updateStudentProfileForAppSchema),
        protectRoute,
        restrict('ADMIN', 'STUDENT', 'PARENT'),
        asyncErrorHandler(updateStudentProfileForAppHandler)
    );

export default studentsRoute;
