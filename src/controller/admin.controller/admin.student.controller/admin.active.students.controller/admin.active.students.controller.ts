import { NextFunction, Request, Response } from 'express';

import {
    alumniStudentById,
    assignClassToStudent,
    createLeaveApplication,
    deEnrollActiveStudent,
    defaultSelectActiveStudents,
    defaultSelectActiveStudentsWIthNoSubjects,
    deleteClassAssignment,
    deleteLeaveApplication,
    enrollActiveStudent,
    fetchLeavesForStudent,
    fetchRecentSchoolAttendanceForStudent,
    findActiveStudentById,
    findActiveStudentEnrolledSubjects,
    findActiveStudents,
    findActiveStudentsWithNoSubjects,
    findCurrentTermToAssignClass,
    findFeePaymentById,
    findLeaveById,
    findStudentAttendanceById,
    findStudentFeeDetails,
    findTermSubjectGroupIdEnrolledSubjects,
    findTermToEnrollActiveStudent,
    findUniqueStudentClassDetails,
    manageClasses,
    markAbsentByEditSchoolCheckInAttendanceForStudent,
    markPresentByEditSchoolCheckInAttendanceForStudent,
    searchActiveStudents,
    searchActiveStudentsWithNoSubjects,
    selectActiveStudents,
    selectActiveStudentsWithNoSubjects,
    updateAmountPaid,
    updateLeaveApplication
} from '../../../../service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service';
import {
    ActiveStudentEnrollDataSchema,
    AlumniStudentByIdSchema,
    AssignClassToStudentSchema,
    CreateLeaveApplicationSchema,
    DefaultSelectActiveStudentsSchema,
    DeleteClassAssignmentSchema,
    DeleteLeaveApplicationSchema,
    FetchLeavesForStudentSchema,
    FetchRecentSchoolAttendanceSchema,
    FindActiveStudentEnrolledSubjectsSchema,
    FindAllActiveStudentsSchema,
    FindLeaveByIdSchema,
    FindStudentAttendanceByIdSchema,
    FindStudentFeeDetailsSchemaSchema,
    FindTermSubjectGroupIdEnrolledSubjectsSchema,
    FindUniqueActiveStudentSchema,
    FindUniqueFeePaymentSchema,
    ManageClassSchema,
    MarkAbsentByEditSchoolCheckInAttendanceForStudentSchema,
    MarkPresentByEditSchoolCheckInAttendanceForStudentSchema,
    SearchActiveStudentsSchema,
    SelectActiveStudentsSchema,
    UpdateAmountPaidSchema,
    UpdateLeaveApplicationSchema
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
export const findActiveStudentsWithNoSubjectsHandler = async (req: Request<{}, {}, {}, FindAllActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findActiveStudentsWithNoSubjects(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findActiveStudentsWithNoSubjects(page, +termId);
        res.status(200).json(allStudent);
    }
};

export const searchActiveStudentsHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId, attendanceOption, attSort } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudents(search, +page, +termId, subjectOption, levelOption, sectionOption, attendanceOption, attSort);
        res.status(200).json(searchResult);
    }
};
export const searchActiveStudentsWithNoSubjectsHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId, attendanceOption } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudentsWithNoSubjects(search, +page, +termId, subjectOption, levelOption, sectionOption, attendanceOption);
        res.status(200).json(searchResult);
    }
};
export const defaultSelectActiveStudentsHandler = async (req: Request<{}, {}, {}, DefaultSelectActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await defaultSelectActiveStudents(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await defaultSelectActiveStudents(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const defaultSelectActiveStudentsWIthNoSubjectsHandler = async (req: Request<{}, {}, {}, DefaultSelectActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await defaultSelectActiveStudentsWIthNoSubjects(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await defaultSelectActiveStudentsWIthNoSubjects(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const selectActiveStudentsHandler = async (req: Request<{}, {}, {}, SelectActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId, attendanceOption } = req.query;

    if (termId) {
        const searchResult = await selectActiveStudents(search, +page, +termId, subjectOption, levelOption, sectionOption, attendanceOption);
        res.status(200).json(searchResult);
    }
};
export const selectActiveStudentsWithNoSubjectsHandler = async (req: Request<{}, {}, {}, SelectActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId, attendanceOption } = req.query;

    if (termId) {
        const searchResult = await selectActiveStudentsWithNoSubjects(search, +page, +termId, subjectOption, levelOption, sectionOption, attendanceOption);
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
/****** * remove/ delete  class for  student*****/
export const deleteClassAssignmentHandler = async (req: Request<DeleteClassAssignmentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const result = await deleteClassAssignment(id);
    res.status(200).json(result);
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
// Enroll Active Student Handler
export const enrollActiveStudentHandler = async (req: Request<{}, {}, ActiveStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollmentData = req.body;
    const enrollmentResult = await enrollActiveStudent(enrollmentData);
    res.status(200).json(enrollmentResult);
};

// De-enroll Active Student Handler
export const deEnrollActiveStudentHandler = async (req: Request<{}, {}, ActiveStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const deEnrollmentData = req.body;
    const deEnrollmentResult = await deEnrollActiveStudent(deEnrollmentData);
    res.status(200).json(deEnrollmentResult);
};
// findTermToEnrollForActiveStudent
export const findTermToEnrollActiveStudentHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const termToEnroll = await findTermToEnrollActiveStudent();
    res.status(200).json(termToEnroll);
};
// last two schoolattendanace
export const fetchRecentSchoolAttendanceForStudentHandler = async (req: Request<FetchRecentSchoolAttendanceSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const attendanceRecords = await fetchRecentSchoolAttendanceForStudent(studentId);
    res.status(200).json(attendanceRecords);
};

export const createLeaveApplicationHandler = async (req: Request<CreateLeaveApplicationSchema['params'], {}, CreateLeaveApplicationSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, appliedById, appliedByRole } = req.params;
    const { comments, endDate, reason, startDate, status } = req.body;
    const leaveApplication = await createLeaveApplication(studentId, appliedById, appliedByRole, startDate, endDate, reason, status, comments);
    res.status(201).json(leaveApplication);
};

export const updateLeaveApplicationHandler = async (req: Request<UpdateLeaveApplicationSchema['params'], {}, UpdateLeaveApplicationSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { leaveId, updatedById } = req.params;
    const { endDate, startDate, comments, reason, status } = req.body;
    const updatedLeaveApplication = await updateLeaveApplication(leaveId, updatedById, reason, comments, status, startDate, endDate);
    res.status(200).json(updatedLeaveApplication);
};

export const deleteLeaveApplicationHandler = async (req: Request<DeleteLeaveApplicationSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { leaveId } = req.params;
    await deleteLeaveApplication(leaveId);
    res.status(200).json({ message: 'Leave application deleted successfully' });
};
export const fetchLeavesForStudentHandler = async (req: Request<FetchLeavesForStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const leaveApplications = await fetchLeavesForStudent(Number(studentId));
    res.status(200).json(leaveApplications);
};
export const findLeaveByIdHandler = async (req: Request<FindLeaveByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { leaveId } = req.params;
    const leaveApplication = await findLeaveById(Number(leaveId));
    res.status(200).json(leaveApplication);
};

export const getStudentAttendanceByIdHandler = async (req: Request<FindStudentAttendanceByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const attendanceRecords = await findStudentAttendanceById(studentId);
    res.status(200).json(attendanceRecords);
};

export const alumniStudentByIdHandler = async (req: Request<AlumniStudentByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const updatedStudent = await alumniStudentById(studentId);
    res.status(200).json(updatedStudent);
};

// edit change attendance at the attendance tab in activestudent detail page

export const markPresentByEditSchoolCheckInAttendanceForStudentHandler = async (
    req: Request<MarkPresentByEditSchoolCheckInAttendanceForStudentSchema['params'], {}, MarkPresentByEditSchoolCheckInAttendanceForStudentSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const remarks = req.body?.remarks;
    const date = req.body.date;
    const { studentId } = req.params;
    if (remarks) {
        const markSchoolCheckInAttendance = await markPresentByEditSchoolCheckInAttendanceForStudent(studentId, date, remarks);
        res.status(200).json(markSchoolCheckInAttendance);
    } else {
        const markSchoolCheckInAttendance = await markPresentByEditSchoolCheckInAttendanceForStudent(studentId, date);
        res.status(200).json(markSchoolCheckInAttendance);
    }
};
export const markAbsentByEditSchoolCheckInAttendanceForStudentHandler = async (
    req: Request<MarkAbsentByEditSchoolCheckInAttendanceForStudentSchema['params'], {}, MarkAbsentByEditSchoolCheckInAttendanceForStudentSchema['body'], {}>,
    res: Response,
    next: NextFunction
) => {
    const remarks = req.body?.remarks;
    const date = req.body.date;
    const { studentId } = req.params;
    if (remarks) {
        const markSchoolCheckInAttendance = await markAbsentByEditSchoolCheckInAttendanceForStudent(studentId, date, remarks);
        res.status(200).json(markSchoolCheckInAttendance);
    } else {
        const markSchoolCheckInAttendance = await markAbsentByEditSchoolCheckInAttendanceForStudent(studentId, date);
        res.status(200).json(markSchoolCheckInAttendance);
    }
};
