import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import {
    createSchoolTimetableHandler,
    createTimeTablesHandler,
    fetchActiveTimetableHandler,
    findActiveTimetableHandler,
    updateTimetableHandler
} from '../../../controller/admin.controller/admin.timetable.controller/admin.timetable.controller';
import { createSchoolTimetableSchema, fetchTimetableSchema, findUniqueTimetableSchema, timeTableSchema, updateTimeTableSchema } from '../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminTimetableRoute = express.Router();

adminTimetableRoute.route('/create-new-timetable').post(validate(timeTableSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createTimeTablesHandler));
adminTimetableRoute.route('/update-timetable/:id').put(validate(updateTimeTableSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(updateTimetableHandler));
adminTimetableRoute.route('/find-active-timetable').get(protectRoute, restrict('ADMIN', 'TEACHER', 'STUDENT'), asyncErrorHandler(findActiveTimetableHandler));

adminTimetableRoute.route('/create-school-timetable').post(validate(createSchoolTimetableSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(createSchoolTimetableHandler));
adminTimetableRoute.route('/fetch-active-timetable/:day').get(validate(fetchTimetableSchema), protectRoute, restrict('ADMIN'), asyncErrorHandler(fetchActiveTimetableHandler));

export default adminTimetableRoute;
