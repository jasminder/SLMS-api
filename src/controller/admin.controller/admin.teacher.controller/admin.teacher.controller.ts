import { NextFunction, Request, Response } from 'express';

import {
    AssignClassToTeacherSchema,
    AssignSubjectToApprovedTeacherSchema,
    DeleteClassToTeacherSchema,
    DeleteSubjectToApprovedTeacherSchema,
    FindUniqueTeacherSchema,
    SearchTeachersSchema
} from '../../../schema/admin.dto/admin.teacher.dto/admin.teacher.dto';
import {
    assignClassToTeacher,
    findCurrentTermToAssignClass,
    assignSubjectToApprovedTeacher,
    findAllSubjectsToAssignTeacher,
    findAllTeachers,
    findSubjectsAssignedToApprovedTeacher,
    findTeacherById,
    searchTeachers,
    findAllAssignedClassesForTeachers,
    deleteTeacherSubject,
    deleteClassForTeacher,
    findAllAssignedClasses
} from '../../../service/admin.service/admin.teacher.service/admin.teacher.service';

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
};
/*find all subject to assign teacher*/
export const findAllSubjectsToAssignTeacherHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allSubjects = await findAllSubjectsToAssignTeacher();
    res.status(200).json(allSubjects);
};
/*Assign a subject to assign applicant*/
export const assignSubjectToApprovedTeacherHandler = async (
    req: Request<AssignSubjectToApprovedTeacherSchema['params'], {}, AssignSubjectToApprovedTeacherSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
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
// find current term for assign classes to active teachers
export const findCurrentTermToAssignClassHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTerm = await findCurrentTermToAssignClass();
    res.status(200).json(currentTerm);
};
/****** * assign class to teacher*****/
export const assignClassToTeacherHandler = async (req: Request<AssignClassToTeacherSchema['params'], {}, AssignClassToTeacherSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { teacherId, termId } = req.params;
    const { levelName, sectionName, subjectName } = req.body;
    if (teacherId && termId && levelName && sectionName && subjectName) {
        const assignClass = await assignClassToTeacher(teacherId, termId, subjectName, levelName, sectionName);
        res.status(200).json(assignClass);
    }
};
/*get all classes for teachers*/
export const findAllAssignedClassesForTeachersHandler = async (req: Request<FindUniqueTeacherSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const classes= await findAllAssignedClassesForTeachers(id);
    res.status(200).json(classes);
};
/*delete subject for teachers*/
export const deleteTeacherSubjectHandler = async (
    req: Request<DeleteSubjectToApprovedTeacherSchema['params'], {}, DeleteSubjectToApprovedTeacherSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const { teacherId } = req.params;
    const { subjectName } = req.body;
    const teacher = await deleteTeacherSubject(teacherId, subjectName);
    res.status(200).json(teacher);
};
/*delete class for teachers*/
export const deleteClassForTeacherHandler = async (req: Request<DeleteClassToTeacherSchema['params'], {}, DeleteClassToTeacherSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { teacherId, termId } = req.params;
    const { levelName, sectionName, subjectName } = req.body;
    if (teacherId && termId && levelName && sectionName && subjectName) {
        const teacher = await deleteClassForTeacher(teacherId, termId, subjectName, levelName, sectionName);
        res.status(200).json(teacher);
    }
};

export const findAllAssignedClassesHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allClasses = await findAllAssignedClasses();
    res.status(200).json(allClasses);
};