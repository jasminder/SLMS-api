// institution.route.ts
import express from 'express';

import { createInstitutionSchema } from '../../../schema/admin.dto/admin.institution.dto/admin.institution.dto';
import { createInstitutionHandler, getInstitutionHandler } from '../../../controller/admin.controller/admin.institution.controller/admin.institution.controller';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import validate from '../../../middleware/validateResource';

const adminInstitutionRoute = express.Router();

adminInstitutionRoute.route('/create-institution').post(validate(createInstitutionSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createInstitutionHandler));
adminInstitutionRoute.route('/get-institution').post(protectRoute, restrict('ADMIN'), asyncErrorHandler(getInstitutionHandler));
export default adminInstitutionRoute;
