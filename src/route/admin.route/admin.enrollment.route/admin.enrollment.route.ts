import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    applicantEnrollDataSchema,
    findAllApplicantSchema,
    findStudentToDeleteSchema,
    findUniqueApplicantSchema,
    findUnseenApplicantSchema,
    searchApplicantSchema,
    updateApplicationStatusSchema
} from '../../../schema/admin.dto/admin.enrollment.dto/admin.enrollment.dto';
import {
    deEnrollApplicantHandler,
    deleteApplicationHandler,
    enrollApplicantHandler,
    enrollApplicantToStudentHandler,
    findAllApplicantsHandler,
    findApplicantByIdHandler,
    findApplicantEnrolledSubjectsHandler,
    findCurrentTermToEnrollHandler,
    findPublishedTermToEnrollHandler,
    markApplicantAsSeenHandler,
    searchApplicantHandler,
    updateApplicationStatusHandler
} from '../../../controller/admin.controller/admin.enrollment.controller/admin.enrollment.controller';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminEnrollmentRoute = express.Router();

/*Applicants CRUD*/
adminEnrollmentRoute.route('/get-all-applicants').get(validate(findAllApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findAllApplicantsHandler));
adminEnrollmentRoute.route('/search-applicants').get(validate(searchApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchApplicantHandler));

/* find unique applicant by id*/
adminEnrollmentRoute.route('/applicant-detail/:id').get(validate(findUniqueApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findApplicantByIdHandler));
/* find published term to enroll */
adminEnrollmentRoute.route('/term-to-enroll').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findPublishedTermToEnrollHandler));
/* find current term to enroll */
adminEnrollmentRoute.route('/current-term-to-enroll').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findCurrentTermToEnrollHandler));

/*enroll applicant to subject*/
adminEnrollmentRoute.route('/enroll-applicant').post(validate(applicantEnrollDataSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(enrollApplicantHandler));
/*find enrolled subject for applicants*/
adminEnrollmentRoute.route('/find-enrolled-subjects-applicant/:id').get(validate(findUniqueApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findApplicantEnrolledSubjectsHandler));
adminEnrollmentRoute.route('/update-has-seen-applicant/:studentId').get(validate(findUnseenApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markApplicantAsSeenHandler));
adminEnrollmentRoute.route('/update-application-status/:studentId').patch(validate(updateApplicationStatusSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateApplicationStatusHandler));
adminEnrollmentRoute.route('/delete-application/:studentId').delete(validate(findStudentToDeleteSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteApplicationHandler));

//***** */  NOT USED *****//
/*enroll the applicant to student*/

adminEnrollmentRoute.route('/enroll-applicant-to-student/:id').post(validate(findUniqueApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(enrollApplicantToStudentHandler));

//***** */  NOT USED *****//

/* de-enroll applicant to subjects */
adminEnrollmentRoute.route('/de-enroll-applicant').post(validate(applicantEnrollDataSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deEnrollApplicantHandler));
export default adminEnrollmentRoute;
