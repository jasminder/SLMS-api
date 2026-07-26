import express from 'express';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createSkipReportByStudentHandler,
    getSkipReportsByStudentHandler
} from '../../../controller/student.controller/student.dashboard.controller/student.communication.controller/student.communication.controller';
import { createSkipReportByStudentSchema, getSkipReportsByStudentSchema } from '../../../schema/student.dto/student.dashboard.dto/student.communication.dto/student.communication.dto';

const studentCommunicationRoute = express.Router();

/* create student skip report*/
studentCommunicationRoute
    .route('/create-skip-report-for-student/:studentId')
    .post(validate(createSkipReportByStudentSchema), protectRoute, restrict('STUDENT'), asyncErrorHandler(createSkipReportByStudentHandler));
/* read student skip reports — ADMIN included so the mobile admin panel's "view as
   student" mode can render this tab. Every other student-portal read already allows
   ADMIN; the create route above stays STUDENT-only, so an admin can look but not
   file a report on a student's behalf. */
studentCommunicationRoute.route('/get-skip-reports/:studentId').get(validate(getSkipReportsByStudentSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getSkipReportsByStudentHandler));

export default studentCommunicationRoute;
