import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';

import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { deEnrollAlumniEnrolledToSubjectsHandler, enrollAlumniToSubjectsHandler, findAllAlumniHandler, findAlumniByIdHandler, findAlumniEnrolledSubjectsHandler, findTermToEnrollForAlumniHandler, makeAlumniToActiveByIdHandler, searchAlumniHandler } from '../../../controller/admin.controller/admin.alumni.controller/admin.alumni.controller';
import { alumniEnrollDataSchema, findAllAlumniSchema, findAlumniSubjectsSchema, findUniqueAlumniSchema, makeAlumniToActiveByIdSchema, searchAlumniSchema } from '../../../schema/admin.dto/admin.alumni.dto/admin.alumni.dto';

const adminAlumniRoute = express.Router();

/*alumni CRUD*/
adminAlumniRoute.route('/get-all-alumni').get(validate(findAllAlumniSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findAllAlumniHandler));
adminAlumniRoute.route('/search-alumni').get(validate(searchAlumniSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchAlumniHandler));
adminAlumniRoute.route('/alumni-detail/:alumniId').get(validate(findUniqueAlumniSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findAlumniByIdHandler));
adminAlumniRoute.route('/make-alumni-to-active/:alumniId').patch(validate(makeAlumniToActiveByIdSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(makeAlumniToActiveByIdHandler));



adminAlumniRoute.route('/term-to-enroll-alumni').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findTermToEnrollForAlumniHandler));

/*find enrolled subject for late enrollments*/
adminAlumniRoute
    .route('/find-enrolled-subjects-for-alumni/:alumniId/:termId')
    .get(validate(findAlumniSubjectsSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findAlumniEnrolledSubjectsHandler));
/*enroll applicant to subject*/
adminAlumniRoute.route('/enroll-alumni').post(validate(alumniEnrollDataSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(enrollAlumniToSubjectsHandler));
/* de-enroll enrolled student to subjects */
adminAlumniRoute.route('/de-enroll-alumni').post(validate(alumniEnrollDataSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(deEnrollAlumniEnrolledToSubjectsHandler));

export default adminAlumniRoute;
