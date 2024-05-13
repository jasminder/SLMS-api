import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    defaultSelectActiveStudentsForFeeCreationSchema,
    feeTemplateQueryByTermIdSchema,
    feeTemplateSchema,
    feeTemplateUndoSchema,
    findAllActiveStudentsForFeeCreationSchema,
    searchActiveStudentsForfeeCreationSchema,
    selectActiveStudentsForFeeCreationSchema
} from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import {
    createFeeTemplateHandler,
    defaultSelectActiveStudentsForFeeCreationHandler,
    fetchFeeTemplatesByTermHandler,
    findActiveStudentsForFeeCreationHandler,
    getCurrentTermSubjectGroupsHandler,
    searchActiveStudentsForFeeCreationHandler,
    selectActiveStudentsForFeeCreationHandler,
    undoCreateFeeTemplateHandler
} from '../../../controller/admin.controller/admin.fee.controller/admin.fee.controller';

const adminFeeRoute = express.Router();

// routes/feeTemplateRoutes.js
adminFeeRoute
    .route('/create-fee-template-and-feePayments-records-for-active-students-by-subject-group')
    .post(validate(feeTemplateSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createFeeTemplateHandler));

adminFeeRoute.route('/undo-fee-template/:feeTemplateId').delete(validate(feeTemplateUndoSchema), protectRoute, restrict('ADMIN'), undoCreateFeeTemplateHandler);

adminFeeRoute.route('/find-all-fee-templates').get(validate(feeTemplateQueryByTermIdSchema), protectRoute, restrict('ADMIN'), fetchFeeTemplatesByTermHandler);

adminFeeRoute.route('/current-term-subject-groups').get(protectRoute, restrict('ADMIN'), getCurrentTermSubjectGroupsHandler);
adminFeeRoute
    .route('/get-all-active-students-for-fee-creation')
    .get(validate(findAllActiveStudentsForFeeCreationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsForFeeCreationHandler));
adminFeeRoute
    .route('/search-active-students-for-fee-creation')
    .get(validate(searchActiveStudentsForfeeCreationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsForFeeCreationHandler));

/*default and select students*/
adminFeeRoute
    .route('/get-default-active-students-for-fee-creation')
    .get(validate(defaultSelectActiveStudentsForFeeCreationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(defaultSelectActiveStudentsForFeeCreationHandler));
adminFeeRoute
    .route('/select-active-students-for-fee-creation')
    .get(validate(selectActiveStudentsForFeeCreationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(selectActiveStudentsForFeeCreationHandler));

export default adminFeeRoute;
