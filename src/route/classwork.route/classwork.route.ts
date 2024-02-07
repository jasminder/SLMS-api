import express from 'express';
import validate from '../../middleware/validateResource';
import { createClassworkHandler, findClassworkBySubjectListHandler } from '../../controller/classwork.controller/classwork.controller';
import { createClassworkSchema, findAllClassworksBySubjectsListSchema } from '../../schema/classwork.dto/classwork.dto';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const classworkRoute = express.Router();

classworkRoute.route('/create/:termSubjectLevelId/:uploaderId').post(validate(createClassworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createClassworkHandler));
classworkRoute
    .route('/find-all/:termSubjectLevelIds/:teacherId')
    .get(validate(findAllClassworksBySubjectsListSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findClassworkBySubjectListHandler));
export default classworkRoute;
