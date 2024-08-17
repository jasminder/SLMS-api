import express from 'express';
import validate from '../../middleware/validateResource';
import { createClassworkHandler, deleteClassworkHandler, editClassworkHandler, findAssignedClassworkByTermAndSectionHandler, findClassworkByIdHandler, findClassworkBySubjectListHandler, findClassworkByTermAndSectionHandler } from '../../controller/classwork.controller/classwork.controller';
import { createClassworkSchema, deleteClassworkSchema, editClassworkSchema, findAllClassworksBySubjectsListSchema, findAssignedClassworkByTermAndSectionSchema, findClassworkByIdSchema, findClassworkByTermAndSectionSchema } from '../../schema/classwork.dto/classwork.dto';
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
classworkRoute
    .route('/find-all-by-class-termSubjectLevel-section/:teacherId')
    .get(validate(findAssignedClassworkByTermAndSectionSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findAssignedClassworkByTermAndSectionHandler));

classworkRoute.route('/find-by-id/:classworkId').get(validate(findClassworkByIdSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findClassworkByIdHandler));

/* edit classwork*/
classworkRoute
    .route('/edit/:classworkId/:termSubjectLevelId/:sectionId/:uploaderId')
    .patch(validate(editClassworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(editClassworkHandler));

/*delete classwork*/
classworkRoute.route('/delete/:classworkId').delete(validate(deleteClassworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(deleteClassworkHandler));

export default classworkRoute;
