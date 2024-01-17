import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createNewTermSetupHandler,
    deleteTermHandler,
    endTermHandler,
    findAllTermHandler,
    findUniqueTermHandler,
    changeCurrentTermNameHandler,
    extendCurrentTermHandler,
    findAllLevelsHandler,
    makeCurrentTermHandler,
    findAllSubjectsHandler,
    makePublishTermHandler,
    findAllGroupsHandler,
    findAllStudentsInATermHandler,
    findCurrentTermHandler,
    findPublishTermAdministrationHandler,
    unPublishTermTermHandler
} from '../../../controller/admin.controller/admin.administration.controller/admin.administration.controller';
import { changeCurrentTermNameSchema, createNewTermSetupSchema, extendCurrentTermSchema, findUniqueTermSchema } from '../../../schema/admin.dto/admin.administration.dto/admin.administration.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminAdministrationRoute = express.Router();

/*Term CRUD*/
adminAdministrationRoute.route('/find-all-terms').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findAllTermHandler));
adminAdministrationRoute.route('/find/term-detail/:id').get(validate(findUniqueTermSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findUniqueTermHandler));
adminAdministrationRoute.route('/update/end-term/:id').patch(validate(findUniqueTermSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(endTermHandler));
adminAdministrationRoute.route('/delete-term/:id').delete(validate(findUniqueTermSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteTermHandler));
adminAdministrationRoute.route('/update/term-name/:id').put(validate(changeCurrentTermNameSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(changeCurrentTermNameHandler));
adminAdministrationRoute.route('/update/extend-term/:id').put(validate(extendCurrentTermSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(extendCurrentTermHandler));
adminAdministrationRoute.route('/find-current-term').get(protectRoute, restrict('ADMIN', 'TEACHER'),asyncErrorHandler(findCurrentTermHandler));
adminAdministrationRoute.route('/find-published-term-administration').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findPublishTermAdministrationHandler));

// find students in a term
adminAdministrationRoute.route('/term-students-list/:id').get(validate(findUniqueTermSchema), asyncErrorHandler(findAllStudentsInATermHandler));

/*create organization set up*/
adminAdministrationRoute.route('/create-new-term-setup').post(validate(createNewTermSetupSchema), asyncErrorHandler(createNewTermSetupHandler));
adminAdministrationRoute.route('/update/make-current-term/:id').patch(validate(findUniqueTermSchema), asyncErrorHandler(makeCurrentTermHandler));
adminAdministrationRoute.route('/update/make-publish-term/:id').patch(validate(findUniqueTermSchema), asyncErrorHandler(makePublishTermHandler));
adminAdministrationRoute.route('/update/un-publish-term/:id').patch(validate(findUniqueTermSchema), asyncErrorHandler(unPublishTermTermHandler));

/*Groups*/
adminAdministrationRoute.route('/get-all-groups').get(asyncErrorHandler(findAllGroupsHandler));

/*Subjects*/
adminAdministrationRoute.route('/get-all-subjects').get(asyncErrorHandler(findAllSubjectsHandler));

/* Levels*/
adminAdministrationRoute.route('/get-all-levels').get(asyncErrorHandler(findAllLevelsHandler));
export default adminAdministrationRoute;
