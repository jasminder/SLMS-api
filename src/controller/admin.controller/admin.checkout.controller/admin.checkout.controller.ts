import { NextFunction, Request, Response } from 'express';
import { fetchCheckedInStudentsForCheckout, markSelectedStudentsAsCheckedOut, markStudentAsCheckedOut } from '../../../service/admin.service/admin.checkout.service/admin.checkout.service';
import { MarkSelectedStudentsAsCheckedOutSchema, MarkStudentAsCheckedOutSchema } from '../../../schema/admin.dto/admin.checkout.dto/admin.checkout.dto';

// Fetch all students who are checked in for the current day for checkingout at the end of school day
export const fetchCheckedInStudentsForCheckoutHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const checkedinStudents = await fetchCheckedInStudentsForCheckout();
    res.status(200).json(checkedinStudents);
};

// Function to mark a student as checked out in SchoolCheckInAttendance records
export const markStudentAsCheckedOutHandler = async (req: Request<MarkStudentAsCheckedOutSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;

    const markSchoolCheckInAttendanceAsCheckout = await markStudentAsCheckedOut(studentId);
    res.status(200).json(markSchoolCheckInAttendanceAsCheckout);
};
// Function to mark multiple students as checked out in SchoolCheckInAttendance records
export const markSelectedStudentsAsCheckedOutHandler = async (req: Request<{}, {}, MarkSelectedStudentsAsCheckedOutSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentIds } = req.body;
    const selectedStudentsCheckedIn = await markSelectedStudentsAsCheckedOut(studentIds);
    res.status(200).json(selectedStudentsCheckedIn);
};