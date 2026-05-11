import { Request, Response } from 'express';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import { customError } from '../../../../utils/customError';
import { FindUniqueEnrolledStudentSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';
import {
    UpdateStudentEmergencyDetailSchema,
    UpdateStudentHealthDetailSchema,
    UpdateStudentParentsDetailSchema,
    UpdateStudentPasswordSchema,
    UpdateStudentPersonalDetailSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.student.update.dto/admin.student.update.dto';
import {
    updateStudentEmergencyContact,
    updateStudentHealthInformation,
    updateStudentParentsDetail,
    updateStudentPassword,
    updateStudentPersonalDetail
} from '../../../../service/admin.service/admin.student.service/admin.student.update.service/admin.student.update.service';
import { recordStudentProfileActivity } from '../../../../service/admin.service/admin.student.service/admin.student.activity.service/admin.student.activity.service';

export const updateStudentPersonalDetailHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentPersonalDetailSchema['body'], {}>, res: Response) => {
        try {
            const { id } = req.params;
            const data = req.body.data;
            const updateStudent = await updateStudentPersonalDetail(id, data);
            await recordStudentProfileActivity({
                studentId: +id,
                actionType: 'PERSONAL_DETAIL_UPDATE',
                description: 'Personal details updated',
                performedByUserId: req.user?.id,
                performedByEmail: req.user?.email ?? 'System',
            }).catch(() => {});
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'email or contact already exists') {
                const error = customError(`This email or contact you are trying to update already exists in student database`, 'fail', 404, true);
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

export const updateStudentParentsDetailHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentParentsDetailSchema['body'], {}>, res: Response) => {
        try {
            const { id } = req.params;
            const data = req.body.data;
            const updateStudent = await updateStudentParentsDetail(id, data);
            await recordStudentProfileActivity({
                studentId: +id,
                actionType: 'PARENTS_DETAIL_UPDATE',
                description: 'Parents/guardian details updated',
                performedByUserId: req.user?.id,
                performedByEmail: req.user?.email ?? 'System',
            }).catch(() => {});
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'student does not exist with given ID') {
                const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

export const updateStudentHealthInformationHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentHealthDetailSchema['body'], {}>, res: Response) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const updateStudent = await updateStudentHealthInformation(id, data);
            await recordStudentProfileActivity({
                studentId: +id,
                actionType: 'HEALTH_DETAIL_UPDATE',
                description: 'Health information updated',
                performedByUserId: req.user?.id,
                performedByEmail: req.user?.email ?? 'System',
            }).catch(() => {});
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'student does not exist with given ID') {
                const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
                res.status(400).json({ message: error.message });
            } else {
                console.log(err, 'ERROR******');
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

export const updateStudentPasswordHandler = asyncErrorHandler(
    async (req: Request<{ id: string }, {}, UpdateStudentPasswordSchema['body'], {}>, res: Response) => {
        try {
            const { id } = req.params;
            const { newPassword, confirmPassword } = req.body;
            await updateStudentPassword(id, newPassword, confirmPassword);
            res.status(200).json({ message: 'Password updated successfully' });
        } catch (err: any) {
            if (err.message === 'Passwords do not match') {
                res.status(400).json({ message: 'Passwords do not match' });
            } else if (err.message === 'Student user account not found') {
                res.status(404).json({ message: 'Student user account not found' });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

export const updateStudentEmergencyContactHandler = asyncErrorHandler(
    async (req: Request<{ id: string }, {}, UpdateStudentEmergencyDetailSchema['body'], {}>, res: Response) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const updatedStudent = await updateStudentEmergencyContact(id, data);
            await recordStudentProfileActivity({
                studentId: +id,
                actionType: 'EMERGENCY_CONTACT_UPDATE',
                description: 'Emergency contact details updated',
                performedByUserId: req.user?.id,
                performedByEmail: req.user?.email ?? 'System',
            }).catch(() => {});
            res.status(200).json(updatedStudent);
        } catch (err: any) {
            if (err.message == 'Student does not exist with given ID') {
                const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);
