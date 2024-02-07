import { NextFunction, Request, Response } from 'express';
import { createTeacherApplicant, findAllSubjects } from '../../service/new.applicant.service/teacher.applicant.service';
import { TeacherApplicantSchema } from '../../schema/teacher.applicant.dto/teacher.applicant.dto';

export const findAllSubjectshandler = async (req: Request, res: Response, next: NextFunction) => {
    const allSubjects = await findAllSubjects();
    res.status(200).json(allSubjects);
};
export const createTeacherApplicantHandler = async (req: Request<{}, {}, TeacherApplicantSchema['body'], {}>, res: Response, next: NextFunction) => {

    const data = req.body;
    const newTeacherApplicant = await createTeacherApplicant(data);
    res.status(200).json(newTeacherApplicant);
};
