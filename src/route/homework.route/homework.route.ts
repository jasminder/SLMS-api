import express from 'express';

import validate from '../../middleware/validateResource';
import { createHomeworkHandler, findHomeworkByIdHandler, findHomeworkBySubjectListHandler } from '../../controller/homework.controller/homework.controller';
import { createHomeworkSchema, findAllHomeworksBySubjectsListSchema, findHomeworkByIdSchema } from '../../schema/homework.dto/homework.dto';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const homeworkRoute = express.Router();
/*sign up user*/
homeworkRoute.route('/create/:termSubjectLevelId/:uploaderId').post(validate(createHomeworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createHomeworkHandler));
homeworkRoute.route('/find-by-id/:homeworkId').get(validate(findHomeworkByIdSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findHomeworkByIdHandler));
homeworkRoute
    .route('/find-by-subjectList/:termSubjectLevelIds/:teacherId')
    .get(validate(findAllHomeworksBySubjectsListSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findHomeworkBySubjectListHandler));
/*login  user*/

export default homeworkRoute;
