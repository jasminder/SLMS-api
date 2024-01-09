import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    assignClassToTeacherHandler,
    assignSubjectToApprovedTeacherHandler,
    deleteClassForTeacherHandler,
    deleteTeacherSubjectHandler,
    findAllAssignedClassesForTeachersHandler,
    findAllSubjectsToAssignTeacherHandler,
    findAllTeachersHandler,
    findCurrentTermToAssignClassHandler,
    findSubjectsAssignedToApprovedTeacherHandler,
    findTeacherByIdHandler,
    searchTeachersHandler
} from '../../../controller/admin.controller/admin.teacher.controller/admin.teacher.controller';
import {
    assignClassToTeacherSchema,
    assignSubjectToApprovedTeacherSchema,
    deleteClassToTeacherSchema,
    deleteSubjectToApprovedTeacherSchema,
    findUniqueTeacherSchema,
    searchTeachersSchema
} from '../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';

const adminTeacherRoute = express.Router();
//find all teachers
adminTeacherRoute.route('/get-all-teachers').get(asyncErrorHandler(findAllTeachersHandler));
adminTeacherRoute.route('/search-teachers').get(validate(searchTeachersSchema), asyncErrorHandler(searchTeachersHandler));
/* find unique applicant by id*/
adminTeacherRoute.route('/teacher-detail/:id').get(validate(findUniqueTeacherSchema), asyncErrorHandler(findTeacherByIdHandler));
/* find  subjects to assign */
adminTeacherRoute.route('/find-all-subjects-to-assign').get(asyncErrorHandler(findAllSubjectsToAssignTeacherHandler));
/*Assign a subject to teacher*/
adminTeacherRoute.route('/assign-subject-to-teacher/:teacherId').post(validate(assignSubjectToApprovedTeacherSchema), asyncErrorHandler(assignSubjectToApprovedTeacherHandler));
/*find subject assigned applicant*/
adminTeacherRoute.route('/find-assigned-subjects-to-teacher/:id').get(validate(findUniqueTeacherSchema), asyncErrorHandler(findSubjectsAssignedToApprovedTeacherHandler));
// find current term for assign classes to active teacher
adminTeacherRoute.route('/find-current-term-to-assign-class-to-teacher').get(asyncErrorHandler(findCurrentTermToAssignClassHandler));
/****** * assign class to teacher*****/
adminTeacherRoute.route('/assign-class-to-teacher/:teacherId/:termId').post(validate(assignClassToTeacherSchema), asyncErrorHandler(assignClassToTeacherHandler));
/*get all classes for teacher*/
adminTeacherRoute.route('/find-assigned-classes-for-teacher/:id').get(validate(findUniqueTeacherSchema), asyncErrorHandler(findAllAssignedClassesForTeachersHandler));
/*delete subjects for teachers*/
adminTeacherRoute.route('/delete-subject-for-teacher/:teacherId').delete(validate(deleteSubjectToApprovedTeacherSchema), asyncErrorHandler(deleteTeacherSubjectHandler));
/*delete classes for teachers*/
adminTeacherRoute.route('/delete-class-for-teacher/:teacherId/:termId').delete(validate(deleteClassToTeacherSchema), asyncErrorHandler(deleteClassForTeacherHandler));

export default adminTeacherRoute;
