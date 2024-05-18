
import { NextFunction, Request, Response } from 'express';
import { createLeaveApplicationByStudent, fetchLeavesForStudentPortal } from '../../../../service/student.service/student.leave.service/student.leave.service';
import { CreateLeaveApplicationByStudentSchema, FetchLeavesForStudentPortalSchema } from '../../../../schema/student.dto/student.dashboard.dto/student.leave.dto/student.leave.dto';

export const createLeaveApplicationByStudentHandler = async (req: Request<CreateLeaveApplicationByStudentSchema['params'], {}, CreateLeaveApplicationByStudentSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, appliedById, appliedByRole } = req.params;
    const { comments, endDate, reason, startDate, status } = req.body;
    const leaveApplication = await createLeaveApplicationByStudent(studentId, appliedById, appliedByRole, startDate, endDate, reason, status, comments);
    res.status(201).json(leaveApplication);
};

export const fetchLeavesForStudentPortalHandler = async (req: Request<FetchLeavesForStudentPortalSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const leaveApplications = await fetchLeavesForStudentPortal(Number(studentId));
    res.status(200).json(leaveApplications);
};