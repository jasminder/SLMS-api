import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import {
    activeStudentEnrollDataSchema,
    alumniStudentByIdSchema,
    applyCreditSchema,
    assignClassToStudentSchema,
    createLeaveApplicationSchema,
    defaultSelectActiveStudentsSchema,
    deleteClassAssignmentSchema,
    deleteLeaveApplicationSchema,
    fetchLeavesForStudentSchema,
    fetchRecentSchoolAttendanceSchema,
    findActiveStudentEnrolledSubjectsSchema,
    findAllActiveStudentsSchema,
    findLeaveByIdSchema,
    findStudentAttendanceByIdSchema,
    findStudentFeeDetailsSchema,
    findTermSubjectGroupIdEnrolledSubjectsSchema,
    findUniqueActiveStudentSchema,
    findUniqueFeePaymentSchema,
    getPaymentsByFeePaymentIdSchema,
    manageClassSchema,
    markAbsentByEditSchoolCheckInAttendanceForStudentSchema,
    markPresentByEditSchoolCheckInAttendanceForStudentSchema,
    searchActiveStudentsSchema,
    selectActiveStudentsSchema,
    updateAmountFeeDueSchema,
    updateAmountPaidAtSchoolSchema,
    updateLeaveApplicationSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';
import {
    alumniStudentByIdHandler,
    applyCreditHandler,
    assignClassToStudentHandler,
    createLeaveApplicationHandler,
    deEnrollActiveStudentHandler,
    defaultSelectActiveStudentsHandler,
    defaultSelectActiveStudentsWIthNoSubjectsHandler,
    deleteClassAssignmentHandler,
    deleteLeaveApplicationHandler,
    enrollActiveStudentHandler,
    fetchLeavesForStudentHandler,
    fetchRecentSchoolAttendanceForStudentHandler,
    findActiveStudentByIdHandler,
    findActiveStudentEnrolledSubjectsHandler,
    findActiveStudentsHandler,
    findActiveStudentsWithNoSubjectsHandler,
    findCurrentTermToAssignClassHandler,
    findFeePaymentByIdHandler,
    findLeaveByIdHandler,
    findStudentFeeDetailsHandler,
    findTermSubjectGroupIdEnrolledSubjectsHandler,
    findTermToEnrollActiveStudentHandler,
    findUniqueStudentClassDetailsHandler,
    getPaymentsByFeePaymentIdHandler,
    getStudentAttendanceByIdHandler,
    manageClassesHandler,
    markAbsentByEditSchoolCheckInAttendanceForStudentHandler,
    markPresentByEditSchoolCheckInAttendanceForStudentHandler,
    searchActiveStudentsHandler,
    searchActiveStudentsWithNoSubjectsHandler,
    selectActiveStudentsHandler,
    selectActiveStudentsWithNoSubjectsHandler,
    updateAmountFeeDueHandler,
    updateAmountPaidAtSchoolHandler,
    updateLeaveApplicationHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.active.students.controller/admin.active.students.controller';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';
import {
    findActiveStudentsWithoutPaginationHandler,
    searchActiveStudentsWithoutPaginationHandler
} from '../../../../controller/admin.controller/admin.studentCard.controller/admin.studentCard.controller';
import { findAllActiveStudentsWOPaginatonSchema, searchActiveStudentsWOPaginatonSchema } from '../../../../schema/admin.dto/admin.studentCard.dto/admin.studentCard.dto';
import { markSchoolCheckInAttendanceForStudentHandler } from '../../../../controller/admin.controller/admin.checkin.controller/admin.checkin.controller';

const adminActiveStudentRoute = express.Router();

/*find all enrolled students*/
adminActiveStudentRoute.route('/get-all-active-students').get(validate(findAllActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsHandler));
adminActiveStudentRoute
    .route('/get-all-active-students-with-no-subjects')
    .get(validate(findAllActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsWithNoSubjectsHandler));

/*search active students*/
adminActiveStudentRoute.route('/search-active-students').get(validate(searchActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsHandler));
adminActiveStudentRoute
    .route('/search-active-students-with-no-subjects')
    .get(validate(searchActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsWithNoSubjectsHandler));

//defaultActiveStudentsSchema
adminActiveStudentRoute.route('/get-default-active-students').get(validate(defaultSelectActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(defaultSelectActiveStudentsHandler));
adminActiveStudentRoute
    .route('/get-default-active-students-with-no-subjects')
    .get(validate(defaultSelectActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(defaultSelectActiveStudentsWIthNoSubjectsHandler));

//selectActiveStudentsSchema
adminActiveStudentRoute.route('/select-active-students').get(validate(selectActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(selectActiveStudentsHandler));
adminActiveStudentRoute
    .route('/select-active-students-with-no-subjects')
    .get(validate(selectActiveStudentsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(selectActiveStudentsWithNoSubjectsHandler));

/*find all enrolled students*/
/*used to print student id cards*/
adminActiveStudentRoute
    .route('/get-all-active-students-WO-pagination')
    .get(validate(findAllActiveStudentsWOPaginatonSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentsWithoutPaginationHandler));

/*search active students*/
adminActiveStudentRoute
    .route('/search-active-students-WO-pagination')
    .get(validate(searchActiveStudentsWOPaginatonSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(searchActiveStudentsWithoutPaginationHandler));

// Without Pagination
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
adminActiveStudentRoute.route('/fee-payment-update-amountPaid-at-school').patch(validate(updateAmountPaidAtSchoolSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateAmountPaidAtSchoolHandler));

adminActiveStudentRoute.route('/update-amount-due').patch(validate(updateAmountFeeDueSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateAmountFeeDueHandler));

// Assuming you are using Express and the route is defined in a specific router file
adminActiveStudentRoute.patch('/apply-credit-balance-to-student-feePayment-by-id', validate(applyCreditSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(applyCreditHandler));
adminActiveStudentRoute.get('/payment-installments-details-by-feepayment-Id/:feePaymentId', validate(getPaymentsByFeePaymentIdSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(getPaymentsByFeePaymentIdHandler));



/*find enrolled subject for late enrollments*/
adminActiveStudentRoute
    .route('/find-enrolled-subjects-active-student/:studentId/:termId')
    .get(validate(findActiveStudentEnrolledSubjectsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentEnrolledSubjectsHandler));

// find current term for assign classes to active students
adminActiveStudentRoute.route('/find-current-term-to-assign-class').get(protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findCurrentTermToAssignClassHandler));

/****** * assign class to student*****/
adminActiveStudentRoute
    .route('/assign-class-active-student/:studentId/:termId')
    .post(validate(assignClassToStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(assignClassToStudentHandler));

/****** * delete class to student*****/
adminActiveStudentRoute.route('/delete-class-active-student/:id').delete(validate(deleteClassAssignmentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteClassAssignmentHandler));

/*get all classes for students*/
adminActiveStudentRoute
    .route('/find-assigned-classes-for-active-student/:id')
    .get(validate(findUniqueActiveStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findUniqueStudentClassDetailsHandler));
adminActiveStudentRoute.route('/manage-toggle-active-class/:id').patch(validate(manageClassSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(manageClassesHandler));

// Enroll an active student to a subject
adminActiveStudentRoute.route('/enroll-active-student').post(validate(activeStudentEnrollDataSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(enrollActiveStudentHandler));

// De-enroll an active student from a subject
adminActiveStudentRoute.route('/de-enroll-active-student').post(validate(activeStudentEnrollDataSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deEnrollActiveStudentHandler));

/* find term to enroll */
adminActiveStudentRoute.route('/term-to-enroll-active-student').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(findTermToEnrollActiveStudentHandler));
// last two schoolattendanace
adminActiveStudentRoute
    .route('/two-recent-school-attendance/:studentId')
    .get(validate(fetchRecentSchoolAttendanceSchema), protectRoute, restrict('ADMIN'), fetchRecentSchoolAttendanceForStudentHandler);

adminActiveStudentRoute
    .route('/create-leave-application/:studentId/:appliedById/:appliedByRole')
    .post(validate(createLeaveApplicationSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(createLeaveApplicationHandler));
adminActiveStudentRoute
    .route('/update-leave-application/:leaveId/:updatedById')
    .patch(validate(updateLeaveApplicationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateLeaveApplicationHandler));

adminActiveStudentRoute.route('/delete-leave-application/:leaveId').delete(validate(deleteLeaveApplicationSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteLeaveApplicationHandler));

adminActiveStudentRoute.route('/get-all-leaves/:studentId').get(validate(fetchLeavesForStudentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(fetchLeavesForStudentHandler));

adminActiveStudentRoute.route('/get-leave-by-id/:leaveId').get(validate(findLeaveByIdSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findLeaveByIdHandler));

adminActiveStudentRoute
    .route('/attendance-detail/:studentId')
    .get(validate(findStudentAttendanceByIdSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(getStudentAttendanceByIdHandler));


adminActiveStudentRoute.route('/make-alumni/:studentId').patch(validate(alumniStudentByIdSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(alumniStudentByIdHandler));

adminActiveStudentRoute.route('/mark-present-by-edit-attendance/:studentId').patch(validate(markPresentByEditSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markPresentByEditSchoolCheckInAttendanceForStudentHandler));
adminActiveStudentRoute.route('/mark-absent-by-edit-attendance/:studentId').patch(validate(markAbsentByEditSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markAbsentByEditSchoolCheckInAttendanceForStudentHandler));

export default adminActiveStudentRoute;
//makeAlumniToActiveByIdHandler
