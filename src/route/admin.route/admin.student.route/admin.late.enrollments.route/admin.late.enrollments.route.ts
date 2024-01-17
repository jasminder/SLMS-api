import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import {
    findAllLateEnrolledStudentsSchema,
    findLateEnrolledStudentSubjectsSchema,
    findUniqueLateEnrolledStudentSchema,
    lateEnrolledActiveStudentSchema,
    searchlateEnrolledStudentsSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.late.enrollments.dto/admin.late.enrollments.dto';
import {
    findLateEnrolledStudentByIdHandler,
    findLateEnrolledStudentSubjectsHandler,
    findLateEnrolledStudentsHandler,
    findTermToEnrollForLateEnrolledStudentHandler,
    searchLateEnrolledStudentsHandler,
    deEnrollStudentEnrolledToSubjectsHandler,
    enrollStudentEnrolledToSubjectsHandler,
    lateEnrolledActiveStudentHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.late.enrollments.controller/admin.late.enrollments.controller';
import { enrolledStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';

const adminLateEnrolledStudentRoute = express.Router();

/*find all late enrolled students*/
adminLateEnrolledStudentRoute.route('/get-all-late-enrolled-students').get(validate(findAllLateEnrolledStudentsSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findLateEnrolledStudentsHandler));

/*search enrolled students*/
adminLateEnrolledStudentRoute.route('/search-all-late-enrolled-students').get(validate(searchlateEnrolledStudentsSchema), protectRoute, restrict('ADMIN'),asyncErrorHandler(searchLateEnrolledStudentsHandler));
adminLateEnrolledStudentRoute.route('/late-enrolled-student-detail/:id').get(validate(findUniqueLateEnrolledStudentSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findLateEnrolledStudentByIdHandler));
/* find term to enroll */
adminLateEnrolledStudentRoute.route('/term-to-enroll-late-enrolled-student').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findTermToEnrollForLateEnrolledStudentHandler));

/*find enrolled subject for late enrollments*/
adminLateEnrolledStudentRoute
    .route('/find-enrolled-subjects-for-late-enrolled-student/:id/:termId')
    .get(validate(findLateEnrolledStudentSubjectsSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findLateEnrolledStudentSubjectsHandler));
/*enroll applicant to subject*/
adminLateEnrolledStudentRoute.route('/enroll-late-enrolled-student').post(validate(enrolledStudentEnrollDataSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(enrollStudentEnrolledToSubjectsHandler));
/* de-enroll enrolled student to subjects */
adminLateEnrolledStudentRoute.route('/de-enroll-late-enrolled-student').post(validate(enrolledStudentEnrollDataSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(deEnrollStudentEnrolledToSubjectsHandler));
adminLateEnrolledStudentRoute.route('/enroll-late-enrolled-student-to-active').post(validate(lateEnrolledActiveStudentSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(lateEnrolledActiveStudentHandler));
export default adminLateEnrolledStudentRoute;
