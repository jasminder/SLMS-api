import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';

import {
    enrolledStudentEnrollDataSchema,
    findAllEnrolledStudentsSchema,
    findUniqueEnrolledStudentSchema,
    searchEnrolledStudentsSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';
import {
    deEnrollStudentEnrolledToSubjectsHandler,
    enrollStudentEnrolledToSubjectsHandler,
    enrollToCurrenTermHandler,
    findAllEnrolledStudentsHandler,
    findEnrolledStudentByIdHandler,
    findEnrolledStudentEnrolledSubjectsHandler,
    findTermToEnrollForStudentEnrolledHandler,
    searchEnrolledStudentsHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.enrolled.student.controller/admin.enrolled.student.controller';
import { protectRoute } from '../../../../middleware/protectRoutes';
import { restrict } from '../../../../middleware/restrict';

const adminEnrolledStudentRoute = express.Router();
/*find all enrolled students*/
adminEnrolledStudentRoute.route('/get-all-enrolled-students').get(validate(findAllEnrolledStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findAllEnrolledStudentsHandler));

/*search enrolled students*/
adminEnrolledStudentRoute.route('/search-enrolled-students').get(validate(searchEnrolledStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchEnrolledStudentsHandler));

adminEnrolledStudentRoute.route('/enrolled-student-detail/:id').get(validate(findUniqueEnrolledStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findEnrolledStudentByIdHandler));

/*******************************************/
/* find term to enroll */
adminEnrolledStudentRoute.route('/term-to-enroll-student-enrolled').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findTermToEnrollForStudentEnrolledHandler));
/*find enrolled subject for applicants*/
adminEnrolledStudentRoute
    .route('/find-enrolled-subjects-for-enrolled-student/:id')
    .get(protectRoute, restrict('ADMIN'), validate(findUniqueEnrolledStudentSchema), asyncErrorHandler(findEnrolledStudentEnrolledSubjectsHandler));

/*******************************************/

/*enroll applicant to subject*/
adminEnrolledStudentRoute.route('/enroll-enrolled-student').post(validate(enrolledStudentEnrollDataSchema), asyncErrorHandler(enrollStudentEnrolledToSubjectsHandler));
/* de-enroll enrolled student to subjects */
adminEnrolledStudentRoute.route('/de-enroll-enrolled-student').post(validate(enrolledStudentEnrollDataSchema), asyncErrorHandler(deEnrollStudentEnrolledToSubjectsHandler));
// enroll enrolled-student to active student for the current term
adminEnrolledStudentRoute.route('/enrolled-student-to-current-term/:id').post(validate(findUniqueEnrolledStudentSchema), asyncErrorHandler(enrollToCurrenTermHandler));
// adminEnrolledStudentRoute.route('/deleteAllStudents');
export default adminEnrolledStudentRoute;
