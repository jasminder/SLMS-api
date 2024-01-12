import { NextFunction, Request, Response } from 'express';
import { FetchStudentsInSameClass, FindTeacherByIdSchema } from '../../schema/teacher.dto/teacher.dto';
import {
    fetchStudentsInSameClass,
    findAllClassesAssignedForTeacher,
    findCurrentTermForTeacher,
    findSubjectsAssignedForTeacher,
    findTeacherByIdForTeacher
} from '../../service/teacher.service/teacher.service';

// find unqiue teacherby ID for internal queries
export const findTeacherByIdForTeacherHandler = async (req: Request<FindTeacherByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const teacher = await findTeacherByIdForTeacher(id);
    res.status(200).json(teacher);
};
// find current term for teachers
export const findCurrentTermForTeacherHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTerm = await findCurrentTermForTeacher();
    res.status(200).json(currentTerm);
};
/*find subject assigned teacher*/
export const findSubjectsAssignedForTeacherHandler = async (req: Request<FindTeacherByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const allSubjects = await findSubjectsAssignedForTeacher(id);
    res.status(200).json(allSubjects);
};
/*get all classes for teachers*/
export const findAllClassesAssignedForTeacherHandler = async (req: Request<FindTeacherByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const classes = await findAllClassesAssignedForTeacher(id);
    res.status(200).json(classes);
};
// find students in the same class
export const fetchStudentsInSameClassHandler = async (req: Request<{}, {}, {}, FetchStudentsInSameClass['query']>, res: Response, next: NextFunction) => {
    const { sectionName, termSubjectLevelId } = req.query;
    if (sectionName && termSubjectLevelId) {
        const classes = await fetchStudentsInSameClass(termSubjectLevelId, sectionName);
        res.status(200).json(classes);
    }
};
