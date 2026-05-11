import { Request, Response } from 'express';
import { updateTeacherPassword, updateTeacherPersonalDetail } from '../../../../service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service';
import { FindUniqueTeacherSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import { UpdateTeacherPasswordSchema, UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import { customError } from '../../../../utils/customError';

export const updateTeacherPersonalDetailHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, UpdateTeacherPersonalDetailSchema['body'], {}>, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body.data;
        const updateTeacher = await updateTeacherPersonalDetail(id, data);
        res.status(200).json(updateTeacher);
    } catch (err: any) {
        if (err.message == 'email or contact already exists') {
            const error = customError(`This email or contact you are trying to update already exists in Teacher database`, 'fail', 404, true);
            res.status(400).json({ message: error.message });
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
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err: any) {
        if (err.message === 'Passwords do not match') {
            res.status(400).json({ message: 'Passwords do not match' });
        } else if (err.message === 'Teacher user account not found') {
            res.status(404).json({ message: 'Teacher user account not found' });
        } else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
