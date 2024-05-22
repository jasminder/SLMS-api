import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { getFeedbackForStudentHandler } from '../../../controller/student.controller/student.feedback.controller/student.feedback.controller';

import { getFeedbackForStudentSchema } from '../../../schema/student.dto/student.feedback.dto/student.feedback.dto';
import { restrict } from '../../../middleware/restrict';
import { findStudentsByEmailHandler } from '../../../controller/student.controller/student.dashboard.controller/student.dashboard.controller';
import { findStudentsByEmailSchema } from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import validate from '../../../middleware/validateResource';

const studentFeedbackRoute = express.Router();

studentFeedbackRoute
    .route('/get-feedback/:studentId/:termSubjectLevelId')
    .get(validate(getFeedbackForStudentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getFeedbackForStudentHandler));

export default studentFeedbackRoute;
