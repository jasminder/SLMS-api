import express from 'express';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import validate from '../../../middleware/validateResource';
import { adminApplicantSchema } from '../../../schema/admin.dto/admin.create.admin.dto/admin.create.admin.dto';
import { createAdminApplicantHandler } from '../../../controller/admin.controller/admin.create.admin.controller/admin.create.admin.controller';



const newadminApplicantRoute = express.Router();

newadminApplicantRoute.route('/create-admin').post(validate(adminApplicantSchema), asyncErrorHandler(createAdminApplicantHandler));

export default newadminApplicantRoute;
