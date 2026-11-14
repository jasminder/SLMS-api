import { Request, Response } from 'express';
import { updateTeacherPassword, updateTeacherPersonalDetail } from '../../../../service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service';
import { FindUniqueTeacherSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import { UpdateTeacherPasswordSchema, UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import { TeacherDuplicateError } from '../../../../service/teacher.duplicate.service/teacher.duplicate.service';
import { AccountActionError } from '../../../../service/account.status.service/account.action.error';
import log from '../../../../utils/logger';

// Messages that are safe to show to the admin as they are. Anything else stays a generic 500.
const SAFE_EDIT_MESSAGES = new Set(['Teacher not found', 'Please provide a valid date of birth.']);

export const updateTeacherPersonalDetailHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, UpdateTeacherPersonalDetailSchema['body'], {}>, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body.data;
        const updateTeacher = await updateTeacherPersonalDetail(id, data);
        res.status(200).json(updateTeacher);
    } catch (err: any) {
        if (err instanceof TeacherDuplicateError) {
            // Backend-enforced block: 409 with the reason and the conflicting teacher ids (admin-only route).
            res.status(409).json(err.toResponse());
        } else if (err?.isOperational && SAFE_EDIT_MESSAGES.has(err.message)) {
            res.status(err.statusCode).json({ message: err.message });
        } else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

export const updateTeacherPasswordHandler = async (req: Request<{ id: string }, {}, UpdateTeacherPasswordSchema['body'], {}>, res: Response) => {
    try {
        const { id } = req.params;
        const { newPassword, confirmPassword } = req.body;
        await updateTeacherPassword(id, newPassword, confirmPassword);
        // Who did it and for whom only; never the password.
        log.info({ adminUserId: req.user?.id, teacherId: id }, 'Admin changed a teacher password');
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err: any) {
        if (err instanceof AccountActionError) {
            // Clear, specific errors: no account yet / conflict / email mismatch / login not available.
            res.status(err.statusCode).json({ message: err.message, code: err.code });
        } else if (err?.message === 'Passwords do not match') {
            res.status(400).json({ message: 'Passwords do not match' });
        } else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
