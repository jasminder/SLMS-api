import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { createFeedbackCategoryWithOptionsSchema, deleteFeedbackCategorySchema, getFeedbackCategorySchema, updateFeedbackCategorySchema } from '../../../schema/admin.dto/admin.feedbackOptions.dto/admin.feedbackOptions.dto';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import {
    createFeedbackCategoryWithOptionsHandler,
    deleteFeedbackCategoryHandler,
    getAllFeedbackCategoriesHandler,
    getSingleFeedbackCategoryHandler,
    updateFeedbackCategoryHandler
} from '../../../controller/admin.controller/admin.feedbackOptions.controller/admin.feedbackOptions.controller';

const adminFeedbackOptionsRoute = express.Router();

adminFeedbackOptionsRoute
    .route('/create-category-with-options')
    .post(validate(createFeedbackCategoryWithOptionsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createFeedbackCategoryWithOptionsHandler));
adminFeedbackOptionsRoute.route('/get-category-with-options').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getAllFeedbackCategoriesHandler));

adminFeedbackOptionsRoute.route('/get-category-byId/:categoryId').get(validate(getFeedbackCategorySchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(getSingleFeedbackCategoryHandler));
adminFeedbackOptionsRoute.route('/update-category/:categoryId').patch(validate(updateFeedbackCategorySchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateFeedbackCategoryHandler));
adminFeedbackOptionsRoute.route('/delete-category-byId/:categoryId').delete(validate(deleteFeedbackCategorySchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteFeedbackCategoryHandler));

export default adminFeedbackOptionsRoute;
