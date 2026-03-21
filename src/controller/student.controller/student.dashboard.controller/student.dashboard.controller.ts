import { NextFunction, Request, Response } from 'express';
import {
    AcknowledgeStudentNoticeSchema,
    FetchStudentAssignmentsSchema,
    FindActiveStudentDetailsSchema,
    FindStudentsByEmailSchema,
    GetStudentNoticeSchema,
    GetStudentNotificationsSchema,
    TeacherAssignmentSchema,
    UpsertDeviceTokenSchema,
    UpdateNotificationSchema
} from '../../../schema/student.dto/student.dashboard.dto/student.dashboard.dto';
import {
    acknowledgeStudentNotice,
    fetchStudentAssignments,
    findStudentDetailsById,
    findStudentsByEmail,
    findTeacherByAssignment,
    getStudentsForApp,
    getAllStudentPortalNotices,
    getAllUnreadStudentNotifications,
    getStudentPortalNotice,
    markNotificationAsRead,
    resolveStudentIdFromUserId,
    upsertStudentDeviceToken
} from '../../../service/student.service/student.dashboard.service/student.dashboard.service';
import { GetStudentportalNoticesSchema } from '../../../schema/admin.dto/admin.notice.dto/admin.notice.dto';

export const findStudentsByEmailHandler = async (req: Request<FindStudentsByEmailSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { email } = req.params;
    const students = await findStudentsByEmail(email);
    res.status(200).json(students);
};

/** GET /api/v1/students — current user's students (siblings) for app switcher. Requires auth. */
export const getStudentsForAppHandler = async (req: Request, res: Response, next: NextFunction) => {
    const email = req.user?.email;
    if (!email) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const students = await getStudentsForApp(email);
    res.status(200).json({ students });
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
    const assignments = await fetchStudentAssignments(+studentId);

    res.status(200).json(assignments);
};

export const getTeacherAssignmentHandler = async (req: Request<TeacherAssignmentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { termSubjectLevelId, sectionId } = req.params;
    const teacherInfo = await findTeacherByAssignment(termSubjectLevelId, sectionId);
    res.status(200).json(teacherInfo);
};
export const getAllUnreadStudentNotificationsHandler = async (
    req: Request<GetStudentNotificationsSchema['params'], {}, {}, GetStudentNotificationsSchema['query']>,
    res: Response,
    next: NextFunction
) => {
    const { studentId } = req.params;
    // const { limit, offset } = req.query;
    const notifications = await getAllUnreadStudentNotifications(studentId);
    res.status(200).json(notifications);
};
export const markNotificationAsReadHandler = async (req: Request<UpdateNotificationSchema['params']>, res: Response, next: NextFunction) => {
    const { notificationId } = req.params;
    const updatedNotification = await markNotificationAsRead(notificationId);
    res.status(200).json(updatedNotification);
};

export const upsertDeviceTokenHandler = async (req: Request<{}, {}, UpsertDeviceTokenSchema['body']>, res: Response) => {
    const { token, platform, userId } = req.body;
    const authUser = req.user;

    const studentIdFromSession = authUser?.student?.id;
    let studentId = studentIdFromSession;

    if (!studentId && userId) {
        studentId = (await resolveStudentIdFromUserId(userId)) ?? undefined;
    }

    if (!studentId) {
        return res.status(400).json({ message: 'Unable to resolve student for this token.' });
    }

    const deviceToken = await upsertStudentDeviceToken(studentId, token, platform);
    res.status(200).json({ message: 'Device token saved.', deviceTokenId: deviceToken.id });
};
