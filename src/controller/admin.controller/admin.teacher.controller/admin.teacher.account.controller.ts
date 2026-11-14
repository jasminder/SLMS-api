import { NextFunction, Request, Response } from 'express';
import { AccountActionError } from '../../../service/account.status.service/account.action.error';
import { getTeacherAccountState } from '../../../service/account.status.service/teacher.account.status.service';
import { createTeacherLogin } from '../../../service/account.status.service/teacher.login.create.service';
import { sendTeacherPasswordResetEmail } from '../../../service/account.status.service/teacher.password.reset.service';
import { resolveClientUrl } from '../../../utils/clientUrl';
import log from '../../../utils/logger';
import type { CreateTeacherLoginSchema } from '../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';

/** GET: the real login-account status of one teacher (ADMIN only; enforced by the route). */
export const getTeacherAccountStatusHandler = async (req: Request<{ id: string }, {}, {}, {}>, res: Response, next: NextFunction) => {
    const teacherId = +req.params.id;
    const state = Number.isInteger(teacherId) ? await getTeacherAccountState(teacherId) : null;
    if (!state) {
        return res.status(404).json({ message: 'Teacher not found.', code: 'TEACHER_NOT_FOUND' });
    }
    res.status(200).json(state.view);
};

/** POST: send a password reset email to the teacher's linked, eligible login (ADMIN only; enforced by the route). */
export const sendTeacherPasswordResetHandler = async (req: Request<{ id: string }, {}, {}, {}>, res: Response, next: NextFunction) => {
    const teacherId = +req.params.id;
    try {
        const result = await sendTeacherPasswordResetEmail(teacherId, resolveClientUrl(req));
        // Who sent it and for whom; never the token or the full address.
        log.info({ adminUserId: req.user?.id, teacherId }, 'Admin sent a teacher password reset email');
        res.status(200).json(result);
    } catch (err) {
        if (err instanceof AccountActionError) {
            return res.status(err.statusCode).json({ message: err.message, code: err.code });
        }
        next(err);
    }
};

/** POST: create the teacher's login on a separate, confirmed email and send the "Set your password" email (ADMIN only; enforced by the route). */
export const createTeacherLoginHandler = async (req: Request<CreateTeacherLoginSchema['params'], {}, CreateTeacherLoginSchema['body'], {}>, res: Response, next: NextFunction) => {
    const teacherId = +req.params.id;
    try {
        const { loginEmail, confirmLoginEmail, ownershipConfirmed } = req.body ?? ({} as CreateTeacherLoginSchema['body']);
        const result = await createTeacherLogin(teacherId, { loginEmail, confirmLoginEmail, ownershipConfirmed }, resolveClientUrl(req));
        // Who created it and for whom; never the email address, token or password.
        log.info({ adminUserId: req.user?.id, teacherId }, 'Admin created a teacher login (setup pending)');
        res.status(201).json(result);
    } catch (err) {
        if (err instanceof AccountActionError) {
            if (err.code === 'SETUP_EMAIL_NOT_SENT') {
                log.info({ adminUserId: req.user?.id, teacherId }, 'Admin created a teacher login (setup pending); setup email not sent');
            }
            return res.status(err.statusCode).json({ message: err.message, code: err.code });
        }
        next(err);
    }
};
