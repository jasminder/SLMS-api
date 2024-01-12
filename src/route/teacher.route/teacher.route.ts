import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { fetchStudentsInSameClassHandler, findAllClassesAssignedForTeacherHandler, findCurrentTermForTeacherHandler, findSubjectsAssignedForTeacherHandler, findTeacherByIdForTeacherHandler } from '../../controller/teacher.controller/teacher.controller';
import { fetchStudentsInSameClassSchema, findTeacherByIdSchema } from '../../schema/teacher.dto/teacher.dto';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const teacherRoute = express.Router();
/* find unique applicant by id*/
teacherRoute.route('/teacher-detail/:id').get(validate(findTeacherByIdSchema), protectRoute, restrict('TEACHER'), asyncErrorHandler(findTeacherByIdForTeacherHandler));
// find current term for assign classes to active teacher
teacherRoute.route('/find-current-term-for-teacher').get(protectRoute, restrict('TEACHER'),asyncErrorHandler(findCurrentTermForTeacherHandler));
/*find subject assigned teacher*/
teacherRoute.route('/find-assigned-subjects-for-teacher/:id').get(validate(findTeacherByIdSchema),protectRoute, restrict('TEACHER'), asyncErrorHandler(findSubjectsAssignedForTeacherHandler));
/*get all classes for teacher*/
teacherRoute.route('/find-classes-assigned-for-teacher/:id').get(validate(findTeacherByIdSchema),protectRoute, restrict('TEACHER'), asyncErrorHandler(findAllClassesAssignedForTeacherHandler));
/*get all students in a classes for teacher*/
teacherRoute.route('/find-students-in-class-for-teacher').get(validate(fetchStudentsInSameClassSchema),protectRoute, restrict('TEACHER'), asyncErrorHandler(fetchStudentsInSameClassHandler));


export default teacherRoute;
