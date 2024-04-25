import express from 'express';

import validate from '../../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import {
    assignClassToTeacherHandler,
    assignSubjectToApprovedTeacherHandler,
    deleteClassForTeacherHandler,
    deleteTeacherSubjectHandler,
    findAllAssignedClassesForTeachersHandler,
    findAllAssignedClassesHandler,
    findAllSubjectsToAssignTeacherHandler,
    findAllTeachersHandler,
    findCurrentTermToAssignClassHandler,
    findSubjectsAssignedToApprovedTeacherHandler,
    findTeacherByIdHandler,
    searchTeachersHandler
} from '../../../../controller/admin.controller/admin.teacher.controller/admin.teacher.controller';
import {
    assignClassToTeacherSchema,
    assignSubjectToApprovedTeacherSchema,
    deleteClassToTeacherSchema,
    deleteSubjectToApprovedTeacherSchema,
    findUniqueTeacherSchema,
    searchTeachersSchema
} from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import { restrict } from '../../../../middleware/restrict';
import { protectRoute } from '../../../../middleware/protectRoutes';

const adminTeacherRoute = express.Router();
//find all teachers
adminTeacherRoute.route('/get-all-teachers').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findAllTeachersHandler));
adminTeacherRoute.route('/search-teachers').get(validate(searchTeachersSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(searchTeachersHandler));
/* find unique teacher by id*/
adminTeacherRoute.route('/teacher-detail/:id').get(validate(findUniqueTeacherSchema), protectRoute, restrict('ADMIN'),asyncErrorHandler(findTeacherByIdHandler));
/* find  subjects to assign */
adminTeacherRoute.route('/find-all-subjects-to-assign').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findAllSubjectsToAssignTeacherHandler));
/*Assign a subject to teacher*/
adminTeacherRoute.route('/assign-subject-to-teacher/:teacherId').post(validate(assignSubjectToApprovedTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(assignSubjectToApprovedTeacherHandler));
/*find subject assigned teacher*/
adminTeacherRoute.route('/find-assigned-subjects-to-teacher/:id').get(validate(findUniqueTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findSubjectsAssignedToApprovedTeacherHandler));
// find current term for assign classes to active teacher
adminTeacherRoute.route('/find-current-term-to-assign-class-to-teacher').get(protectRoute, restrict('ADMIN','TEACHER'),asyncErrorHandler(findCurrentTermToAssignClassHandler));
/****** * assign class to teacher*****/
adminTeacherRoute.route('/assign-class-to-teacher/:teacherId/:termId').post(validate(assignClassToTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(assignClassToTeacherHandler));
/*get all classes for teacher*/
adminTeacherRoute.route('/find-assigned-classes-for-teacher/:id').get(validate(findUniqueTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(findAllAssignedClassesForTeachersHandler));
/*delete subjects for teachers*/
adminTeacherRoute.route('/delete-subject-for-teacher/:teacherId').delete(validate(deleteSubjectToApprovedTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteTeacherSubjectHandler));
/*delete classes for teachers*/
adminTeacherRoute.route('/delete-class-for-teacher/:teacherId/:termId').delete(validate(deleteClassToTeacherSchema),protectRoute, restrict('ADMIN'), asyncErrorHandler(deleteClassForTeacherHandler));
adminTeacherRoute.route('/get-all-classes-for-teachers').get(protectRoute, restrict('ADMIN'),asyncErrorHandler(findAllAssignedClassesHandler));

export default adminTeacherRoute;
