import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import { Err } from './src/types/type';
import { config } from './src/config/config';
import log from './src/utils/logger';
import { customError } from './src/utils/customError';
import newApplicantRoute from './src/route/new.applicant.route/new.applicant.route';
import adminEnrolledStudentRoute from './src/route/admin.route/admin.student.route/admin.enrolled.student.route/admin.enrolled.student.route';
import { globalErrorHandler } from './src/controller/error.controller/error.controller';
import adminAdministrationRoute from './src/route/admin.route/admin.administration.route/admin.administration.route';
import adminEnrollmentRoute from './src/route/admin.route/admin.enrollment.route/admin.enrollment.route';
import adminManageClassRoute from './src/route/admin.route/admin.administration.route/admin.manage.class.route/admin.manage.class.route';
import adminTimetableRoute from './src/route/admin.route/admin.timetable.route/admin.timetable.route';
import adminActiveStudentRoute from './src/route/admin.route/admin.student.route/admin.active.student.route/admin.active.student.route';
import adminLateEnrolledStudentRoute from './src/route/admin.route/admin.student.route/admin.late.enrollments.route/admin.late.enrollments.route';
import newteacherApplicantRoute from './src/route/new.applicant.route/teacher.applicant.router';
import adminTeacherApproveRoute from './src/route/admin.route/admin.teacher.approve.route/admin.teacher.approve.route';
import adminTeacherRoute from './src/route/admin.route/admin.teacher.route/admin.teacher.route/admin.teacher.route';
import authRoute from './src/route/auth.route/auth.route';
import teacherRoute from './src/route/teacher.route/teacher.dashboard.route/teacher.dashboard.route';
import adminCheckinRoute from './src/route/admin.route/admin.checkin.route/admin.checkin.route';
import adminCheckoutRoute from './src/route/admin.route/admin.checkout.route/admin.checkout.route';
import adminAttendanceRoute from './src/route/admin.route/admin.attendance.route/admin.attendance.route';
import teacherAttendanceRoute from './src/route/teacher.route/teacher.attendance.route/teacher.attendance.route';
import newadminApplicantRoute from './src/route/admin.route/admin.create.admin.route/admin.create.admin.route';
import homeworkRoute from './src/route/homework.route/homework.route';
import homeWorkUploadRoute from './src/route/aws.homework.fileUpload.route/aws.homework.fileUpload.route';
import homeWorkDownloadRoute from './src/route/aws.homework.fileDownlod.route/aws.homework.fileDownlod.route';
import sendMailHomeWorkRouter from './src/route/homework.route/homework.sendmail.route/homework.sendmail.route';
import ImageUploadRoute from './src/route/aws.image.fileUpload.route/aws.image.fileUpload.route';
import adminStudentUpdateRoute from './src/route/admin.route/admin.student.route/admin.student.update.route/admin.student.update.route';
import ImageDisplayRoute from './src/route/aws.image.fileDisplay.route/aws.image.fileDisplay.route';
import feedbackRoute from './src/route/teacher.route/teacher.feedback.route/teacher.feedback.route';
import './src/cron/sendFeedBackEmails';
import './src/cron/processMonthlyFees';
import './src/cron/processTermFees';
import commentRoute from './src/route/admin.route/admin.comment.route/admin.comment.route';
import interactionRoute from './src/route/admin.route/admin.interactions.route/admin.interactions.route';
import adminInstitutionRoute from './src/route/admin.route/admin.institution.route/admin.institution.route';
import groupHomeworkRoute from './src/route/teacher.route/teacher.homework.route/teacher.homework.route';
import sendConsolidatedEmailsRouter from './src/route/cron.consolidatedEmail.route/cron.consolidatedEmail.route';
import classworkRoute from './src/route/classwork.route/classwork.route';

const app = express();
app.use(cookieParser());

const origin =
    process.env.NODE_ENV === 'development'
        ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'https://slms-client-2aam.vercel.app']
        : [
              'https://SLMS.com',
              'http://localhost:5173',
              'http://localhost:5174',
              'http://localhost:5175',
              'https://slms-client-2aam.vercel.app',
              'https://akaalshaouni.org'
          ];
app.use(
    cors({
        credentials: true,
        origin: origin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        optionsSuccessStatus: 200
    })
);
// app.use(cors({
//     origin: 'https://slms-client-2aam.vercel.app',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// unhandled exception Error
process.on('uncaughtException', (err: Err) => {
    log.info('->>>>', err.name, err.message);
    log.info('uncaughtException! shutting down.. @ksm');

    process.exit(1);
});
app.get('/test', (req, res, next) => {
    res.status(200).json({ message: 'Consolidated emails sent successfully' });
});
app.get('/healthcheck', (req: Request, res: Response) => res.sendStatus(200));
app.use('/api/v1/application', newApplicantRoute);
app.use('/api/v1/application-teacher', newteacherApplicantRoute);
app.use('/api/v1/application-admin', newadminApplicantRoute);
app.use('/api/v1/admin/administration', adminAdministrationRoute);
app.use('/api/v1/admin/administration/class', adminManageClassRoute);
app.use('/api/v1/admin/administration/approve-teacher-application', adminTeacherApproveRoute);
app.use('/api/v1/admin/administration/teacher', adminTeacherRoute);

app.use('/api/v1/admin/timetable', adminTimetableRoute);
app.use('/api/v1/admin/student/enrolled', adminEnrolledStudentRoute);
app.use('/api/v1/admin/student/late-enrolled', adminLateEnrolledStudentRoute);
app.use('/api/v1/admin/student/active', adminActiveStudentRoute);
app.use('/api/v1/admin/student/update', adminStudentUpdateRoute);
app.use('/api/v1/admin/applicant', adminEnrollmentRoute);
app.use('/api/v1/admin/comment-on-student', commentRoute);
app.use('/api/v1/admin/interactions', interactionRoute);

app.use('/api/v1/admin/institution', adminInstitutionRoute);

/*Attendance and check in and checkout*/
app.use('/api/v1/admin/attendance/checkin', adminCheckinRoute);
app.use('/api/v1/admin/attendance/checkout', adminCheckoutRoute);
app.use('/api/v1/admin/attendance/skip-reports', adminAttendanceRoute);
app.use('/api/v1/teacher/attendance', teacherAttendanceRoute);

app.use('/api/v1/teacher', teacherRoute);
app.use('/api/v1/teacher-feedback-for-student', feedbackRoute);
app.use('/api/v1/teacher-homework-for-student', groupHomeworkRoute);

app.use('/api/v1/auth', authRoute);

app.use('/api/v1/home-work', homeworkRoute);
app.use('/api/v1/class-work', classworkRoute);
//aws presigned route
app.use('/api/v1/upload-image', ImageUploadRoute);
app.use('/api/v1/display-image', ImageDisplayRoute);
app.use('/api/v1/upload-home-work', homeWorkUploadRoute);
app.use('/api/v1/download-home-work', homeWorkDownloadRoute);

app.use('/api/v1/send-mail', sendMailHomeWorkRouter);
app.use('/api/v1/automated-mail', sendConsolidatedEmailsRouter);

// Server frontend static assets and handle catch-all route
// if (process.env.NODE_ENV === 'production') {
//     const __dirname = path.resolve();
//     app.use(express.static(path.join(__dirname, '/client/dist/index.html')));
//     app.get('*', (req: Request, res: Response) => res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html')));
// }

app.all('*', (req: Request, res: Response, next: NextFunction) => {
    // ************** -->> resubale / or use a class customerError
    const error = customError(`cant find ${req.originalUrl}`, 'fail', 404, true);
    next(error);
});

// Global Error handler middleware
app.use(globalErrorHandler);
// server setup to listen to port

const server = app.listen(config.server.port, () => log.info(`Server Port: http://localhost:${config.server.port}`));

// unhandled promise rejection
process.on('unhandledRejection', (err: Err) => {
    log.info('->>>>', err.name, err.message);
    log.info('unhandled rejection! shutting down.. @ksm');
    console.log(err);

    server.close(() => {
        process.exit(1);
    });
});
