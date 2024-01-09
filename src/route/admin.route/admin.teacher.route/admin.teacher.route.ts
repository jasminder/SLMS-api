import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    assignSubjectToApprovedTeacherHandler,
    findAllSubjectsToAssignTeacherHandler,
    findAllTeachersHandler,
    findSubjectsAssignedToApprovedTeacherHandler,
    findTeacherByIdHandler,
    searchTeachersHandler
} from '../../../controller/admin.controller/admin.teacher.controller/admin.teacher.controller';
import { assignSubjectToApprovedTeacherSchema, findUniqueTeacherSchema, searchTeachersSchema } from '../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';

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

export default adminTeacherRoute;
