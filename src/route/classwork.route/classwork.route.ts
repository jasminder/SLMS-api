import express from 'express';
import validate from '../../middleware/validateResource';
import { createClassworkHandler, findClassworkBySubjectListHandler, findClassworkByTermAndSectionHandler } from '../../controller/classwork.controller/classwork.controller';
import { createClassworkSchema, findAllClassworksBySubjectsListSchema, findClassworkByTermAndSectionSchema } from '../../schema/classwork.dto/classwork.dto';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const classworkRoute = express.Router();

classworkRoute.route('/create/:termSubjectLevelId/:sectionId/:uploaderId').post(validate(createClassworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createClassworkHandler));
classworkRoute
    .route('/find-all/:termSubjectLevelIds/:teacherId')
    .get(validate(findAllClassworksBySubjectsListSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findClassworkBySubjectListHandler));

/* Find all Classwork records for a termsubjectlevelid and sectionid */
classworkRoute
    .route('/find-by-class-termSubjectLevel-section/:teacherId')
    .get(validate(findClassworkByTermAndSectionSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findClassworkByTermAndSectionHandler));

export default classworkRoute;
