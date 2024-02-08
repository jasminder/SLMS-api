import express from 'express';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createGroupClassworkHandler } from '../../../controller/teacher.controller/teacher.classwork.controller/teacher.classwork.controller';
import { createGroupClassworkSchema } from '../../../schema/teacher.dto/teacher.classwork.dto/teacher.classwork.dto';

const groupClassworkRoute = express.Router();

groupClassworkRoute.route('/create')
    .post(validate(createGroupClassworkSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(createGroupClassworkHandler));

export default groupClassworkRoute;
