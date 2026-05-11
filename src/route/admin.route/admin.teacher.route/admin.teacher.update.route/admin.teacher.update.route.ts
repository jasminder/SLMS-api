import express from 'express';

import { updateTeacherPasswordSchema, updateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import { updateTeacherPasswordHandler, updateTeacherPersonalDetailHandler } from '../../../../controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller';
import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';

const adminTeacherUpdateRoute = express.Router();

adminTeacherUpdateRoute.route('/personal-detail/:id').patch(validate(updateTeacherPersonalDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateTeacherPersonalDetailHandler));
adminTeacherUpdateRoute.route('/password/:id').patch(validate(updateTeacherPasswordSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateTeacherPasswordHandler));
export default adminTeacherUpdateRoute;
