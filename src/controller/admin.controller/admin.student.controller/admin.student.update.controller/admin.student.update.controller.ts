import { NextFunction, Request, Response } from 'express';
import { asyncErrorHandler } from '../../../../utils/asyncErrorHandler';
import { customError } from '../../../../utils/customError';
import { FindUniqueEnrolledStudentSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';
import {
    UpdateStudentEmergencyDetailSchema,
    UpdateStudentHealthDetailSchema,
    UpdateStudentParentsDetailSchema,
    UpdateStudentPersonalDetailSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.student.update.dto/admin.student.update.dto';
import {
    updateStudentEmergencyContact,
    updateStudentHealthInformation,
    updateStudentParentsDetail,
    updateStudentPersonalDetail
} from '../../../../service/admin.service/admin.student.service/admin.student.update.service/admin.student.update.service';

// update student personal details service
export const updateStudentPersonalDetailHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentPersonalDetailSchema['body'], {}>, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = req.body.data;
            // console.log(data, "con");
            const updateStudent = await updateStudentPersonalDetail(id, data);
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'email or contact already exists') {
                const error = customError(`This email or contact you are trying to update already exists in student database`, 'fail', 404, true);
                res.status(400).json({ message: error.message });
            } else {
                const error = customError('Internal server error- something went wrong while updating student personal details', 'fail', 500, true);
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

// update student parents details service
export const updateStudentParentsDetailHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentParentsDetailSchema['body'], {}>, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = req.body.data;
            const updateStudent = await updateStudentParentsDetail(id, data);
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'student does not exist with given ID') {
                const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
                res.status(400).json({ message: error.message });
            } else {
                const error = customError('Internal server error- something went wrong while updating student parent details', 'fail', 500, true);
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);

// Update Emergency and health Details
export const updateStudentHealthInformationHandler = asyncErrorHandler(
    async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, UpdateStudentHealthDetailSchema['body'], {}>, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const updateStudent = await updateStudentHealthInformation(id, data);
            res.status(200).json(updateStudent);
        } catch (err: any) {
            if (err.message == 'student does not exist with given ID') {
                const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
                res.status(400).json({ message: error.message });
            } else {
                const error = customError('Internal server error- something went wrong while updating student parent details', 'fail', 500, true);
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    }
);
export const updateStudentEmergencyContactHandler = asyncErrorHandler(async (req: Request<{ id: string }, {}, UpdateStudentEmergencyDetailSchema['body'], {}>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const updatedStudent = await updateStudentEmergencyContact(id, data);
        res.status(200).json(updatedStudent);
    } catch (err: any) {
        if (err.message == 'Student does not exist with given ID') {
            const error = customError('The student you are trying to update is either deleted or does not exist', 'fail', 400, true);
            res.status(400).json({ message: error.message });
        } else {
            const error = customError('Internal server error - something went wrong while updating student emergency contact details', 'fail', 500, true);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
