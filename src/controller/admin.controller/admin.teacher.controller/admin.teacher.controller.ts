import { NextFunction, Request, Response } from 'express';

import { AssignSubjectToApprovedTeacherSchema, FindUniqueTeacherSchema, SearchTeachersSchema } from '../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import { assignSubjectToApprovedTeacher, findAllSubjectsToAssignTeacher, findAllTeachers, findSubjectsAssignedToApprovedTeacher, findTeacherById, searchTeachers } from '../../../service/admin.service/admin.teacher.service/admin.teacher.service';

//find all applicants
export const findAllTeachersHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allTeachers = await findAllTeachers();
    res.status(200).json(allTeachers);
};
// search teachers
export const searchTeachersHandler = async (req: Request<{}, {}, {}, SearchTeachersSchema['query']>, res: Response, next: NextFunction) => {
    const { search } = req.query;
    const searchResult = await searchTeachers(search);
    res.status(200).json(searchResult);
};

// find unqiue teacherby ID for internal queries
export const findTeacherByIdHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const applicant = await findTeacherById(id);
    res.status(200).json(applicant);
};/*find all subject to assign teacher*/
export const findAllSubjectsToAssignTeacherHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allSubjects = await findAllSubjectsToAssignTeacher();
    res.status(200).json(allSubjects);
};
/*Assign a subject to assign applicant*/
export const assignSubjectToApprovedTeacherHandler = async (req: Request<AssignSubjectToApprovedTeacherSchema['params'], {}, AssignSubjectToApprovedTeacherSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { teacherId } = req.params;
    const { subjectName } = req.body;
    const allSubjects = await assignSubjectToApprovedTeacher(teacherId, subjectName);
    res.status(200).json(allSubjects);
};
/*find subject assigned teacher*/
export const findSubjectsAssignedToApprovedTeacherHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const allSubjects = await findSubjectsAssignedToApprovedTeacher(id);
    res.status(200).json(allSubjects);
};