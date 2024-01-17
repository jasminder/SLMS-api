import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import {
    assignClassToStudentSchema,
    findActiveStudentEnrolledSubjectsSchema,
    findAllActiveStudentsSchema,
    findStudentFeeDetailsSchema,
    findTermSubjectGroupIdEnrolledSubjectsSchema,
    findUniqueActiveStudentSchema,
    findUniqueFeePaymentSchema,
    manageClassSchema,
    searchActiveStudentsSchema,
    updateAmountPaidSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';
import {
    assignClassToStudentHandler,
    findActiveStudentByIdHandler,
    findActiveStudentEnrolledSubjectsHandler,
    findActiveStudentsHandler,
    findCurrentTermToAssignClassHandler,
    findFeePaymentByIdHandler,
    findStudentFeeDetailsHandler,
    findTermSubjectGroupIdEnrolledSubjectsHandler,
    findUniqueStudentClassDetailsHandler,
    manageClassesHandler,
    searchActiveStudentsHandler,
    updateAmountPaidHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.active.students.controller/admin.active.students.controller';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';

const adminActiveStudentRoute = express.Router();

/*find all enrolled students*/
adminActiveStudentRoute.route('/get-all-active-students').get(validate(findAllActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsHandler));

/*search active students*/
adminActiveStudentRoute.route('/search-active-students').get(validate(searchActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsHandler));

/*find unqiue student*/
adminActiveStudentRoute.route('/active-student-detail/:id').get(validate(findUniqueActiveStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentByIdHandler));
/*find unqiue active student fee details*/
adminActiveStudentRoute.route('/active-student-fee-detail/:studentId').get(validate(findStudentFeeDetailsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findStudentFeeDetailsHandler));
/* find subjects enrolled in a termSubject group*/
adminActiveStudentRoute
    .route('/find-enrolled-subjects-term-subject-group/:id')
    .get(validate(findTermSubjectGroupIdEnrolledSubjectsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findTermSubjectGroupIdEnrolledSubjectsHandler));
/*find unqiue feePaymentById*/
adminActiveStudentRoute.route('/fee-payment-detail/:id').get(validate(findUniqueFeePaymentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findFeePaymentByIdHandler));
/*update fee - amount paid made by the admin*/
adminActiveStudentRoute.route('/fee-payment-update-amountPaid/:id').patch(validate(updateAmountPaidSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateAmountPaidHandler));

/*find enrolled subject for late enrollments*/
adminActiveStudentRoute
    .route('/find-enrolled-subjects-active-student/:studentId/:termId')
    .get(validate(findActiveStudentEnrolledSubjectsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentEnrolledSubjectsHandler));

// find current term for assign classes to active students
adminActiveStudentRoute.route('/find-current-term-to-assign-class').get(protectRoute, restrict('ADMIN','TEACHER'), asyncErrorHandler(findCurrentTermToAssignClassHandler));

/****** * assign class to student*****/
adminActiveStudentRoute
    .route('/assign-class-active-student/:studentId/:termId')
    .post(validate(assignClassToStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(assignClassToStudentHandler));
/*get all classes for students*/
adminActiveStudentRoute
    .route('/find-assigned-classes-for-active-student/:id')
    .get(validate(findUniqueActiveStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findUniqueStudentClassDetailsHandler));
adminActiveStudentRoute.route('/manage-toggle-active-class/:id').patch(validate(manageClassSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(manageClassesHandler));
export default adminActiveStudentRoute;
