import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { createSkipReportByStudentHandler, getSkipReportsByStudentHandler } from '../../../controller/student.controller/student.dashboard.controller/student.communication.controller/student.communication.controller';
import { createSkipReportByStudentSchema, getSkipReportsByStudentSchema } from '../../../schema/student.dto/student.dashboard.dto/student.communication.dto/student.communication.dto';

const studentCommunicationRoute = express.Router();

/* create student skip report*/
studentCommunicationRoute
    .route('/create-skip-report-for-student/:studentId/:teacherId')
    .post(validate(createSkipReportByStudentSchema), protectRoute, restrict('TEACHER', 'ADMIN'), asyncErrorHandler(createSkipReportByStudentHandler));
studentCommunicationRoute
    .route('/get/:studentId').get(validate(getSkipReportsByStudentSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(getSkipReportsByStudentHandler));

export default studentCommunicationRoute;