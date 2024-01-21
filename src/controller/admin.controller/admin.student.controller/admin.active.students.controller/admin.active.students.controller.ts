import { NextFunction, Request, Response } from 'express';

import {
    assignClassToStudent,
    findActiveStudentById,
    findActiveStudentEnrolledSubjects,
    findActiveStudents,
    findCurrentTermToAssignClass,
    findFeePaymentById,
    findStudentFeeDetails,
    findTermSubjectGroupIdEnrolledSubjects,
    findUniqueStudentClassDetails,
    manageClasses,
    searchActiveStudents,
    updateAmountPaid
} from '../../../../service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service';
import {
    AssignClassToStudentSchema,
    FindActiveStudentEnrolledSubjectsSchema,
    FindAllActiveStudentsSchema,
    FindStudentFeeDetailsSchemaSchema,
    FindTermSubjectGroupIdEnrolledSubjectsSchema,
    FindUniqueActiveStudentSchema,
    FindUniqueFeePaymentSchema,
    ManageClassSchema,
    SearchActiveStudentsSchema,
    UpdateAmountPaidSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';

// Find all students for the admin
export const findActiveStudentsHandler = async (req: Request<{}, {}, {}, FindAllActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findActiveStudents(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findActiveStudents(page, +termId);
        res.status(200).json(allStudent);
    }
};

export const searchActiveStudentsHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, page = 0, termId } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudents(search, +page, +termId, subjectOption);
        res.status(200).json(searchResult);
    }
};

export const findActiveStudentByIdHandler = async (req: Request<FindUniqueActiveStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const student = await findActiveStudentById(id);
    res.status(200).json(student);
};
export const findStudentFeeDetailsHandler = async (
    req: Request<FindStudentFeeDetailsSchemaSchema['params'], {}, {}, FindStudentFeeDetailsSchemaSchema['query']>,
    res: Response,
    next: NextFunction
) => {
    const { studentId } = req.params;
    const { termId } = req.query;
    const student = await findStudentFeeDetails(+studentId, +termId);
    res.status(200).json(student);
};
export const findTermSubjectGroupIdEnrolledSubjectsHandler = async (
    req: Request<FindTermSubjectGroupIdEnrolledSubjectsSchema['params'], {}, {}, FindTermSubjectGroupIdEnrolledSubjectsSchema['query']>,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;
    const { termSubjectGroupId } = req.query;
    if (id && termSubjectGroupId) {
        const enrolledSubjects = await findTermSubjectGroupIdEnrolledSubjects(id, termSubjectGroupId);
        res.status(200).json(enrolledSubjects);
    }
};
// findFeePaymentById
export const findFeePaymentByIdHandler = async (req: Request<FindUniqueFeePaymentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const student = await findFeePaymentById(id);
    res.status(200).json(student);
};

/*update fee - amount paid made by the admin*/
export const updateAmountPaidHandler = async (
    req: Request<UpdateAmountPaidSchema['params'], {}, UpdateAmountPaidSchema['body'], UpdateAmountPaidSchema['query']>,
    res: Response,
    next: NextFunction
) => {
    const { id } = req.params;
    const { amountPaid } = req.query;
    const { remarks } = req.body;
    const student = await updateAmountPaid(id, amountPaid, remarks);
    res.status(200).json(student);
};

/* find enrolled subjects for active students*/

export const findActiveStudentEnrolledSubjectsHandler = async (req: Request<FindActiveStudentEnrolledSubjectsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, termId } = req.params;
    if (studentId && termId) {
        const enrolledSubjects = await findActiveStudentEnrolledSubjects(studentId, termId);
        res.status(200).json(enrolledSubjects);
    }
};

// find current term for assign classes to active students
export const findCurrentTermToAssignClassHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTerm = await findCurrentTermToAssignClass();
    res.status(200).json(currentTerm);
};

//AssignClassToStudentSchema
/****** * assign class to student*****/
export const assignClassToStudentHandler = async (req: Request<AssignClassToStudentSchema['params'], {}, AssignClassToStudentSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, termId } = req.params;
    const { levelName, sectionName, subjectName } = req.body;
    if (studentId && termId && levelName && sectionName && subjectName) {
        const assignClass = await assignClassToStudent(studentId, termId, subjectName, levelName, sectionName);
        res.status(200).json(assignClass);
    }
};
/*get all classes for students*/
export const findUniqueStudentClassDetailsHandler = async (req: Request<FindUniqueActiveStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const student = await findUniqueStudentClassDetails(id);
    res.status(200).json(student);
};
/*Manage classes for students*/
export const manageClassesHandler = async (req: Request<ManageClassSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updatedStudentClassHistoryRecords = await manageClasses(id);
    res.status(200).json(updatedStudentClassHistoryRecords);
};
