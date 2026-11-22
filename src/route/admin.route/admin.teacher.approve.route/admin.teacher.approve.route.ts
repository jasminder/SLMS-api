import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    approveTeacherApplicationHandler,
    deleteTeacherApplicationHandler,
    rejectTeacherApplicationHandler,
    undoRejectTeacherApplicationHandler,
    reviewTeacherApplicationHandler,
    assignSubjectToTeacherHandler,
    findAllSubjectsToAssignApplicantHandler,
    findAllTeacherApplicantsHandler,
    findSubjectsAssignedToTeacherHandler,
    findTeacherApplicantByIdHandler,
    searchTeacherApplicantsHandler
} from '../../../controller/admin.controller/admin.teacher.approve.controller/admin.teacher.approve.controller';
import {
    assignSubjectToApplicantSchema,
    findAllTeacherApplicationsSchema,
    findUniqueTeacherApplicantSchema,
    searchTeacherApplicantSchema
} from '../../../schema/admin.dto/admin.teacher.approve.dto/admin.teacher.approve.dto';
import { restrict } from '../../../middleware/restrict';
import { protectRoute } from '../../../middleware/protectRoutes';

const adminTeacherApproveRoute = express.Router();

/*Applicants CRUD*/
adminTeacherApproveRoute.route('/get-all-applicants').get(validate(findAllTeacherApplicationsSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findAllTeacherApplicantsHandler));
adminTeacherApproveRoute.route('/search-applicants').get(validate(searchTeacherApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(searchTeacherApplicantsHandler));

/* find unique applicant by id*/
adminTeacherApproveRoute.route('/applicant-detail/:id').get(validate(findUniqueTeacherApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findTeacherApplicantByIdHandler));

/* find  subjects to assign */
adminTeacherApproveRoute.route('/find-subjects-to-assign').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findAllSubjectsToAssignApplicantHandler));
/*Assign a subject to assign applicant*/
adminTeacherApproveRoute.route('/assign-subject-to-applicant/:teacherId').post(validate(assignSubjectToApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(assignSubjectToTeacherHandler));
// /*find subject assigned applicant*/ assign-subject-to-applicant
adminTeacherApproveRoute.route('/find-assigned-subjects-to-applicant/:id').get(validate(findUniqueTeacherApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findSubjectsAssignedToTeacherHandler));
/*Approve teacherapplication*/
adminTeacherApproveRoute.route('/review-application/:id').get(validate(findUniqueTeacherApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(reviewTeacherApplicationHandler));
adminTeacherApproveRoute.route('/approve-application/:id').post(validate(findUniqueTeacherApplicantSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(approveTeacherApplicationHandler));
/* Reject keeps the application (marked rejected); undo puts it back to pending */
adminTeacherApproveRoute.route('/reject-application/:id').post(validate(findUniqueTeacherApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(rejectTeacherApplicationHandler));
adminTeacherApproveRoute.route('/undo-reject-application/:id').post(validate(findUniqueTeacherApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(undoRejectTeacherApplicationHandler));
/* Delete a pending or rejected application permanently */
adminTeacherApproveRoute.route('/delete-application/:id').delete(validate(findUniqueTeacherApplicantSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteTeacherApplicationHandler));
export default adminTeacherApproveRoute;
