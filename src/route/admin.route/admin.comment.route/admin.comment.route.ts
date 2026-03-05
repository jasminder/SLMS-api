import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import { createCommentHandler, getCommentsHandler, updateCommentHandler } from '../../../controller/admin.controller/admin.comment.controller/admin.comment.controller';
import { createCommentsSchema, updateCommentSchema } from '../../../schema/admin.dto/admin.comment.dto/admin.comment.dto';

const commentRoute = express.Router();

commentRoute.route('/create').post(validate(createCommentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createCommentHandler));
commentRoute.route('/get-comments-student/:studentId').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getCommentsHandler));
commentRoute.route('/update/:commentId').patch(validate(updateCommentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateCommentHandler));
export default commentRoute;
