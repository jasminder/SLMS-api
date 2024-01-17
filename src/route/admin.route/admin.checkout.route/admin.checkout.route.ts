import express from 'express';

import validate from '../../../middleware/validateResource';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { fetchCheckedInStudentsForCheckoutHandler, markSelectedStudentsAsCheckedOutHandler, markStudentAsCheckedOutHandler } from '../../../controller/admin.controller/admin.checkout.controller/admin.checkout.controller';
import { markSelectedStudentsAsCheckedOutSchema, markStudentAsCheckedOutchema } from '../../../schema/admin.dto/admin.checkout.dto/admin.checkout.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';

const adminCheckoutRoute = express.Router();

// Fetch all students who are checked in for the current day for checkingout at the end of school day
adminCheckoutRoute.route('/fetch-checkedin-students-for-checkout').get( protectRoute, restrict('ADMIN'),asyncErrorHandler(fetchCheckedInStudentsForCheckoutHandler));

// Function to mark a student as checked out in SchoolCheckInAttendance records
adminCheckoutRoute.route('/mark-selected-students-as-checkedout/:studentId').patch(validate(markStudentAsCheckedOutchema), protectRoute, restrict('ADMIN'),asyncErrorHandler(markStudentAsCheckedOutHandler));

/*mark the check-in as false for single student ID*/
adminCheckoutRoute.route('/checked-out-selected-students').patch(validate(markSelectedStudentsAsCheckedOutSchema), protectRoute, restrict('ADMIN'),asyncErrorHandler(markSelectedStudentsAsCheckedOutHandler));

export default adminCheckoutRoute;
