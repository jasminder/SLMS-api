import { NextFunction, Request, Response } from 'express';
import {
    approveTeacherApplication,
    deleteTeacherApplication,
    setTeacherApplicationRejected,
    reviewTeacherApplication,
    assignSubjectToTeacher,
    findAllSubjectsToAssignApplicant,
    findAllTeacherApplicants,
    findSubjectsAssignedToTeacher,
    findTeacherApplicantById,
    searchTeacherApplicants
} from '../../../service/admin.service/admin.teacher.approve.service/admin.teacher.approve.service';
import { TeacherDuplicateError } from '../../../service/teacher.duplicate.service/teacher.duplicate.service';
import {
    AssignSubjectToApplicantSchema,
    FindAllTeacherApplicationsSchema,
    FindUniqueTeacherApplicantSchema,
    SearchTeacherApplicantSchema
} from '../../../schema/admin.dto/admin.teacher.approve.dto/admin.teacher.approve.dto';
//find all applicants
export const findAllTeacherApplicantsHandler = async (req: Request<{}, {}, {}, FindAllTeacherApplicationsSchema['query']>, res: Response, next: NextFunction) => {
    const { page } = req.query;

    if (page) {
        const allApplicant = await findAllTeacherApplicants(+page);
        res.status(200).json(allApplicant);
    } else {
        const page = 0;
        const allApplicant = await findAllTeacherApplicants(page);
        res.status(200).json(allApplicant);
    }
};
// search applicants
export const searchTeacherApplicantsHandler = async (req: Request<{}, {}, {}, SearchTeacherApplicantSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0 } = req.query;

    const searchResult = await searchTeacherApplicants(search, +page);
    res.status(200).json(searchResult);
};

// find unqiue applicant by ID for internal queries
export const findTeacherApplicantByIdHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const applicant = await findTeacherApplicantById(id);
    res.status(200).json(applicant);
};
/*find all subject to assign applicant to  a subject*/
export const findAllSubjectsToAssignApplicantHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allSubjects = await findAllSubjectsToAssignApplicant();
    res.status(200).json(allSubjects);
};

/*Assign a subject to assign applicant*/
export const assignSubjectToTeacherHandler = async (req: Request<AssignSubjectToApplicantSchema['params'], {}, AssignSubjectToApplicantSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { teacherId } = req.params;
    const { subjectName } = req.body;
    const allSubjects = await assignSubjectToTeacher(teacherId, subjectName);
    res.status(200).json(allSubjects);

};
/*find subject assigned applicant*/
export const findSubjectsAssignedToTeacherHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const allSubjects = await findSubjectsAssignedToTeacher(id);
    res.status(200).json(allSubjects);
};
/*Read-only duplicate review shown on the approval screen*/
export const reviewTeacherApplicationHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const review = await reviewTeacherApplication(id);
    res.status(200).json(review);
};
/*Approve teacherapplication*/
export const approveTeacherApplicationHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const approveAppllication = await approveTeacherApplication(id);
        res.status(200).json(approveAppllication);
    } catch (err) {
        if (err instanceof TeacherDuplicateError) {
            // Backend-enforced block: 409 with the reason and the conflicting teacher ids (admin-only route).
            return res.status(409).json(err.toResponse());
        }
        next(err);
    }
};

// reject = permanently delete a pending teacher application
export const deleteTeacherApplicationHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    try {
        const result = await deleteTeacherApplication(req.params.id);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// reject a pending teacher application but keep it; undo-reject puts it back to pending
export const rejectTeacherApplicationHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    try {
        res.status(200).json(await setTeacherApplicationRejected(req.params.id));
    } catch (err) {
        next(err);
    }
};
export const undoRejectTeacherApplicationHandler = async (req: Request<FindUniqueTeacherApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    try {
        res.status(200).json(await setTeacherApplicationRejected(req.params.id, true));
    } catch (err) {
        next(err);
    }
};
