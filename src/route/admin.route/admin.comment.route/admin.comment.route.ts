import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

import { createCommentHandler, getCommentsHandler } from '../../../controller/admin.controller/admin.comment.controller/admin.comment.controller';
import { createCommentsSchema } from '../../../schema/admin.dto/admin.comment.dto/admin.comment.dto';

const commentRoute = express.Router();

commentRoute.route('/create').post(validate(createCommentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createCommentHandler));
commentRoute.route('/get-comments-student/:studentId').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getCommentsHandler));
export default commentRoute;
