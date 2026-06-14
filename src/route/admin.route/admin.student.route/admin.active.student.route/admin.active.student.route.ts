import express from 'express';

import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import validate from '../../../../middleware/validateResource';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';
import {
    activeStudentEnrollDataSchema,
    alumniStudentByIdSchema,
    applyCreditSchema,
    assignClassToStudentSchema,
    createLeaveApplicationSchema,
    defaultSelectActiveStudentsSchema,
    deleteClassAssignmentSchema,
    migrateClassAttendanceSchema,
    deleteLeaveApplicationSchema,
    fetchFeePaymentByIdForInvoiceSchema,
    fetchLeavesForStudentSchema,
    fetchRecentSchoolAttendanceSchema,
    findActiveStudentEnrolledSubjectsSchema,
    findAllActiveStudentsSchema,
    findCurrentTermToAssignClassSchema,
    findLeaveByIdSchema,
    findStudentAttendanceByIdSchema,
    findStudentFeeDetailsSchema,
    findTermSubjectGroupIdEnrolledSubjectsSchema,
    findUniqueActiveStudentSchema,
    findUniqueActiveStudentWithoutSubjectsSchema,
    findUniqueFeePaymentSchema,
    getPaymentsByFeePaymentIdSchema,
    manageClassSchema,
    markAbsentByEditSchoolCheckInAttendanceForStudentSchema,
    markPresentByEditSchoolCheckInAttendanceForStudentSchema,
    searchActiveStudentsSchema,
    selectActiveStudentsSchema,
    updateAmountFeeDueSchema,
    updateAmountPaidAtSchoolSchema,
    updatePaymentInstallmentSchema,
    updateLeaveApplicationSchema,
    updateStudentCreditBalanceSchema,
    getStudentProfileActivitySchema
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
    fetchFeePaymentByIdForInvoiceHandler,
    fetchLeavesForStudentHandler,
    fetchRecentSchoolAttendanceForStudentHandler,
    findActiveStudentByIdHandler,
    findActiveStudentEnrolledSubjectsHandler,
    findActiveStudentsHandler,
    findCurrentTermToAssignClassByIdHandler,
    findActiveStudentsWithNoSubjectsHandler,
    findCurrentTermToAssignClassHandler,
    findFeePaymentByIdHandler,
    findLeaveByIdHandler,
    findStudentFeeDetailsHandler,
    findTermSubjectGroupIdEnrolledSubjectsHandler,
    findTermToEnrollActiveStudentHandler,
    findUniqueStudentClassDetailsHandler,
    getActiveStudentsCountHandler,
    getPaymentsByFeePaymentIdHandler,
    getStudentAttendanceByIdHandler,
    manageClassesHandler,
    migrateClassAttendanceHandler,
    markAbsentByEditSchoolCheckInAttendanceForStudentHandler,
    markPresentByEditSchoolCheckInAttendanceForStudentHandler,
    searchActiveStudentsHandler,
    searchActiveStudentsWithNoSubjectsHandler,
    selectActiveStudentsHandler,
    selectActiveStudentsWithNoSubjectsHandler,
    updateAmountFeeDueHandler,
    updateAmountPaidAtSchoolHandler,
    updatePaymentInstallmentHandler,
    updateLeaveApplicationHandler,
    updateStudentCreditBalanceHandler,
    findActiveStudentByIdWithoutSubjectsHandler,
    getStudentProfileActivityHandler
} from '../../../../controller/admin.controller/admin.student.controller/admin.active.students.controller/admin.active.students.controller';

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
adminActiveStudentRoute.route('/active-student-detail/:id').get(validate(findUniqueActiveStudentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findActiveStudentByIdHandler));
adminActiveStudentRoute.route('/active-student-detail-without-subjects/:id').get(validate(findUniqueActiveStudentWithoutSubjectsSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(findActiveStudentByIdWithoutSubjectsHandler));
adminActiveStudentRoute
    .route('/student-profile-activity/:id')
    .get(validate(getStudentProfileActivitySchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getStudentProfileActivityHandler));
/*find unqiue active student fee details*/
adminActiveStudentRoute.route('/active-student-fee-detail/:studentId').get(validate(findStudentFeeDetailsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findStudentFeeDetailsHandler));
/* find subjects enrolled in a termSubject group*/
adminActiveStudentRoute
    .route('/find-enrolled-subjects-term-subject-group/:id')
    .get(validate(findTermSubjectGroupIdEnrolledSubjectsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findTermSubjectGroupIdEnrolledSubjectsHandler));
/*find unqiue feePaymentById*/
adminActiveStudentRoute.route('/fee-payment-detail/:id').get(validate(findUniqueFeePaymentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findFeePaymentByIdHandler));
/*update fee - amount paid made by the admin*/
adminActiveStudentRoute
    .route('/fee-payment-update-amountPaid-at-school')
    .patch(validate(updateAmountPaidAtSchoolSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateAmountPaidAtSchoolHandler));

adminActiveStudentRoute.route('/update-amount-due').patch(validate(updateAmountFeeDueSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateAmountFeeDueHandler));

adminActiveStudentRoute
    .route('/fee-payment-for-invoice-generation/:feePaymentId')
    .get(validate(fetchFeePaymentByIdForInvoiceSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(fetchFeePaymentByIdForInvoiceHandler));

// Assuming you are using Express and the route is defined in a specific router file
adminActiveStudentRoute.patch('/apply-credit-balance-to-student-feePayment-by-id', validate(applyCreditSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(applyCreditHandler));
adminActiveStudentRoute.get(
    '/payment-installments-details-by-feepayment-Id/:feePaymentId',
    validate(getPaymentsByFeePaymentIdSchema),
    protectRoute,
    restrict('ADMIN'),
    asyncErrorHandler(getPaymentsByFeePaymentIdHandler)
);

adminActiveStudentRoute
    .patch('/update-payment-installment', validate(updatePaymentInstallmentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updatePaymentInstallmentHandler));

/*find enrolled subject for late enrollments*/
adminActiveStudentRoute
    .route('/find-enrolled-subjects-active-student/:studentId/:termId')
    .get(validate(findActiveStudentEnrolledSubjectsSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(findActiveStudentEnrolledSubjectsHandler));

// find current term for assign classes to active students (STUDENT allowed for app attendance screen)
adminActiveStudentRoute.route('/find-current-term-to-assign-class').get(protectRoute, restrict('ADMIN', 'TEACHER', 'STUDENT'), asyncErrorHandler(findCurrentTermToAssignClassHandler));

// find current term for assign classes to active students by id
adminActiveStudentRoute.route('/find-current-term-to-assign-class-by-id/:id').get(validate(findCurrentTermToAssignClassSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findCurrentTermToAssignClassByIdHandler));

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
    .get(validate(findStudentAttendanceByIdSchema), protectRoute, restrict('ADMIN', 'TEACHER', 'STUDENT'), asyncErrorHandler(getStudentAttendanceByIdHandler));

adminActiveStudentRoute.route('/make-alumni/:studentId').patch(validate(alumniStudentByIdSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(alumniStudentByIdHandler));

adminActiveStudentRoute
    .route('/mark-present-by-edit-attendance/:studentId')
    .patch(validate(markPresentByEditSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markPresentByEditSchoolCheckInAttendanceForStudentHandler));
adminActiveStudentRoute
    .route('/mark-absent-by-edit-attendance/:studentId')
    .patch(validate(markAbsentByEditSchoolCheckInAttendanceForStudentSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(markAbsentByEditSchoolCheckInAttendanceForStudentHandler));

adminActiveStudentRoute
    .route('/update-student-credit-balance/:studentId')
    .patch(validate(updateStudentCreditBalanceSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateStudentCreditBalanceHandler));

adminActiveStudentRoute.route('/get-active-students-count-without-subject').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getActiveStudentsCountHandler));

/****** migrate ClassAttendance from one section assignment to another *****/
adminActiveStudentRoute
    .route('/migrate-class-attendance/:fromAssignmentId/:toAssignmentId')
    .post(validate(migrateClassAttendanceSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(migrateClassAttendanceHandler));

export default adminActiveStudentRoute;
