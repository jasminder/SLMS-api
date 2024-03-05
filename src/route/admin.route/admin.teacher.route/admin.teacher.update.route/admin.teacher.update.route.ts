import express from 'express';

import { updateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import { updateTeacherPersonalDetailHandler } from '../../../../controller/admin.controller/admin.teacher.controller/admin.teacher.update.controller/admin.teacher.update.controller';
import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';

const adminTeacherUpdateRoute = express.Router();

adminTeacherUpdateRoute.route('/personal-detail/:id').patch(validate(updateTeacherPersonalDetailSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateTeacherPersonalDetailHandler));
export default adminTeacherUpdateRoute;
