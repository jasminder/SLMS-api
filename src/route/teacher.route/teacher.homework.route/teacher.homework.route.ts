import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import { createGroupHomeworkHandler } from '../../../controller/teacher.controller/teacher.homework.controller/teacher.homework.controller';
import { createGroupHomeworkSchema } from '../../../schema/teacher.dto/teacher.homework.dto/teacher.homework.dto';

const groupHomeworkRoute = express.Router();

groupHomeworkRoute.route('/create').post(validate(createGroupHomeworkSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(createGroupHomeworkHandler));

export default groupHomeworkRoute;
