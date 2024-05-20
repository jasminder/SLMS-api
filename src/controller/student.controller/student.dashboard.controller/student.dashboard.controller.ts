import { NextFunction, Request, Response } from 'express';
import {
    AcknowledgeStudentNoticeSchema,
    FetchStudentAssignmentsSchema,
    FindActiveStudentDetailsSchema,
    FindStudentsByEmailSchema,
    GetStudentNoticeSchema
} from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import {
    acknowledgeStudentNotice,
    fetchStudentAssignments,
    findStudentDetailsById,
    findStudentsByEmail,
    getAllStudentPortalNotices,
    getStudentPortalNotice
} from '../../../service/student.service/student.dashboard.service/student.dashboard.service';
import { GetStudentportalNoticesSchema } from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';

export const findStudentsByEmailHandler = async (req: Request<FindStudentsByEmailSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { email } = req.params;
    const students = await findStudentsByEmail(email);
    res.status(200).json(students);
};
export const findStudentDetailsByIdHandler = async (req: Request<FindActiveStudentDetailsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const student = await findStudentDetailsById(studentId);
    res.status(200).json(student);
};

export const getAllStudentPortalNoticesHandler = async (req: Request<GetStudentportalNoticesSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const notices = await getAllStudentPortalNotices(studentId);
    res.status(200).json(notices);
};

export const getStudentNoticePortalHandler = async (req: Request<GetStudentNoticeSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { noticeId } = req.params;
    const notice = await getStudentPortalNotice(noticeId);
    if (notice) {
        res.status(200).json(notice);
    } else {
        res.status(404).json({ message: 'Notice not found' });
    }
};

export const acknowledgeStudentNoticeHandler = async (req: Request<AcknowledgeStudentNoticeSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, studentNoticeId } = req.params;
    const updatedAcknowledgement = await acknowledgeStudentNotice(studentId, studentNoticeId);
    res.status(200).json(updatedAcknowledgement);
};

// Student assignments fetching handler
export const fetchStudentAssignmentsHandler = async (req: Request<FetchStudentAssignmentsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    console.log(studentId);
    const assignments = await fetchStudentAssignments(+studentId);

    res.status(200).json(assignments);
};
