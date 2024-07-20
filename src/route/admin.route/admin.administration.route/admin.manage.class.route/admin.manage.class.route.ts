import express from 'express';

import validate from '../../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import {
    createClassWithSectionsHandler,
    deleteSectionHandler,
    fetchStudentCountInClassHandler,
    findCurrentTermClassesHandler,
    findCurrentTermForManageClassHandler,
    findPublishTermForManageClassHandler,
    findSectionsForManageClassHandler,
    getAllSectionsHandler
} from '../../../../controller/admin.controller/admin.administration.controller/admin.manage.class.controller/admin.manage.class.controller';
import { createClassWithSectionsSchema, fetchStudentCountInClassSchema } from '../../../../schema/admin.dto/admin.administration.dto/admin.manage.class.dto/admin.manage.class.dto';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';

const adminManageClassRoute = express.Router();

adminManageClassRoute.route('/find-publish-term-manage-class').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findPublishTermForManageClassHandler));
adminManageClassRoute.route('/find-current-term-manage-class').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findCurrentTermForManageClassHandler));
adminManageClassRoute.route('/find-current-term-class').get(protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findCurrentTermClassesHandler));
adminManageClassRoute.route('/find-sections-manage-class').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findSectionsForManageClassHandler));
adminManageClassRoute.route('/create-class').post(validate(createClassWithSectionsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createClassWithSectionsHandler));
adminManageClassRoute.get('/all-sections', protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllSectionsHandler));
adminManageClassRoute.delete('/delete-section/:sectionId', protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteSectionHandler));
adminManageClassRoute.route('/count-students-in-class').get(validate(fetchStudentCountInClassSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(fetchStudentCountInClassHandler));

export default adminManageClassRoute;
