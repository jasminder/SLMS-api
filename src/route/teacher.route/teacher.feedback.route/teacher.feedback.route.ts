import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createFeedbackSchema } from '../../../schema/teacher.dto/teacher.feedback.dto/teacher.feedback.dto';
import { createFeedbackHandler } from '../../../controller/teacher.controller/teacher.feedback.controller/teacher.feedback.controller';

const feedbackRoute = express.Router();

feedbackRoute.route('/create').post(validate(createFeedbackSchema), protectRoute, restrict('TEACHER','ADMIN'), asyncErrorHandler(createFeedbackHandler));

export default feedbackRoute;
