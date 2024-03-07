import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import { createGroupHomeworkHandler, findAssignedHomeworksHandler } from '../../../controller/teacher.controller/teacher.homework.controller/teacher.homework.controller';
import { createGroupHomeworkSchema, findAssignedHomeworksSchema } from '../../../schema/teacher.dto/teacher.homework.dto/teacher.homework.dto';

const groupHomeworkRoute = express.Router();

groupHomeworkRoute.route('/create').post(validate(createGroupHomeworkSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(createGroupHomeworkHandler));

groupHomeworkRoute
    .route('/assignedHomeworks/:teacherId/:termSubjectLevelId/:sectionId')
    .get(protectRoute, restrict('TEACHER', 'ADMIN'), validate(findAssignedHomeworksSchema), findAssignedHomeworksHandler);

export default groupHomeworkRoute;
