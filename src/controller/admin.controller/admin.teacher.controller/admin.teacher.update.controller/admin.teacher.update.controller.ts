import { Request, Response, NextFunction } from 'express';
import { updateTeacherPersonalDetail } from '../../../../service/admin.service/admin.teacher.service/admin.teacher.update.service/admin.teacher.update.service';
import { FindUniqueTeacherSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import { UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import { customError } from '../../../../utils/customError';

export const updateTeacherPersonalDetailHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, UpdateTeacherPersonalDetailSchema['body'], {}>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = req.body.data;
        // console.log(data, "con");
        const updateTeacher = await updateTeacherPersonalDetail(id, data);
        res.status(200).json(updateTeacher);
    } catch (err: any) {
        if (err.message == 'email or contact already exists') {
            const error = customError(`This email or contact you are trying to update already exists in Teacher database`, 'fail', 404, true);
            res.status(400).json({ message: error.message });
        } else {
            const error = customError('Internal server error- something went wrong while updating Teacher personal details', 'fail', 500, true);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
