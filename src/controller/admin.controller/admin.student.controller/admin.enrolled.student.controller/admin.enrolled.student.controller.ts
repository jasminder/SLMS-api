import { NextFunction, Request, Response } from 'express';

import { customError } from '../../../../utils/customError';
import {
    deEnrollStudentEnrolledToSubjects,
    deleteManyStudents,
    enrollStudentEnrolledToSubjects,
    enrollToCurrenTerm,
    findAllEnrolledStudents,
    findEnrolledStudentById,
    findEnrolledStudentEnrolledSubjects,
    findTermToEnrollForStudentEnrolled,
    searchEnrolledStudents,

} from '../../../../service/admin.service/admin.student.service/admin.enrolled.student.service/admin.enrolled.student.service';

import {
    EnrolledStudentEnrollDataSchema,
    FindAllEnrolledStudentsSchema,
    FindUniqueEnrolledStudentSchema,
    SearchEnrolledStudentsSchema,
   
} from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';

// find unqiue student by ID for internal queries
export const findEnrolledStudentByIdHandler = async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const student = await findEnrolledStudentById(id);
    res.status(200).json(student);
};

// Find all enrolled student for the admin
export const findAllEnrolledStudentsHandler = async (req: Request<{}, {}, {}, FindAllEnrolledStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findAllEnrolledStudents(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findAllEnrolledStudents(page, +termId);
        res.status(200).json(allStudent);
    }
};

export const searchEnrolledStudentsHandler = async (req: Request<{}, {}, {}, SearchEnrolledStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0, termId } = req.query;
    if (termId) {
        const searchResult = await searchEnrolledStudents(search, +page, +termId);
        res.status(200).json(searchResult);
    }
};

// findTermToEnrollForStudentEnrolled
export const findTermToEnrollForStudentEnrolledHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const termToEnroll = await findTermToEnrollForStudentEnrolled();
    res.status(200).json(termToEnroll);
};

export const findEnrolledStudentEnrolledSubjectsHandler = async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const enrolledSubjects = await findEnrolledStudentEnrolledSubjects(id);
    res.status(200).json(enrolledSubjects);
};

// enrollStudentEnrolledToSubjects
export const enrollStudentEnrolledToSubjectsHandler = async (req: Request<{}, {}, EnrolledStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const termToEnroll = await enrollStudentEnrolledToSubjects(enrollData);
    res.status(200).json(termToEnroll);
};
/* de-enroll enrolled student to subjects */
export const deEnrollStudentEnrolledToSubjectsHandler = async (req: Request<{}, {}, EnrolledStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const message = await deEnrollStudentEnrolledToSubjects(enrollData);
    res.status(200).json(message);
};

// enroll enrolled-student to active student for the current term
export const enrollToCurrenTermHandler = async (req: Request<FindUniqueEnrolledStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const message = await enrollToCurrenTerm(id);

    res.status(200).json(message);
};

// delete student
export const deleteManyStudentsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const newStudent = await deleteManyStudents();
    res.status(200).json('deleted all students');
};
