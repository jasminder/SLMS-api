import { NextFunction, Request, Response } from 'express';
import { CreateWeekdaySchoolCheckInAttendanceForStudentSchema } from '../../../../schema/admin.dto/admin.checkin.dto/admin.weekday.checkin.dto/admin.weekday.checkin.dto';
import { createWeekdaySchoolCheckInAttendanceForStudent } from '../../../../service/admin.service/admin.checkin.service/admin.weekday.checkin.service/admin.weekday.checkin.service';
export const createWeekdaySchoolCheckInAttendanceForStudentHandler = async (
    req: Request<{}, {}, CreateWeekdaySchoolCheckInAttendanceForStudentSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const { date } = req.body;

    const schoolCheckInAttendance = await createWeekdaySchoolCheckInAttendanceForStudent(date);
    res.status(200).json(schoolCheckInAttendance);
};
