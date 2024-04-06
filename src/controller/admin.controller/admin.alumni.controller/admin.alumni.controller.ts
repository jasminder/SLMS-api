import { NextFunction, Request, Response } from 'express';
import { deEnrollAlumniEnrolledToSubjects, enrollAlumniToSubjects, findAllAlumni, findAlumniById, findAlumniEnrolledSubjects, findTermToEnrollForAlumni, makeAlumniToActiveById, searchAlumni } from '../../../service/admin.service/admin.alumni.service/admin.alumni.service';
import { AlumniEnrollDataSchema, FindAllAlumniSchema, FindAlumniSubjectsSchema, FindUniqueAlumniSchema, MakeAlumniToActiveByIdSchema, SearchAlumniSchema } from '../../../schema/admin.dto/admin.alumni.dto/admin.alumni.dto';
export const findAllAlumniHandler = async (req: Request<{}, {}, {}, FindAllAlumniSchema['query']>, res: Response, next: NextFunction) => {
    const { page } = req.query;

    if (page) {
        const allAlumni = await findAllAlumni(+page);
        res.status(200).json(allAlumni);
    } else {
        const page = 0;
        const allAlumni = await findAllAlumni(page);
        res.status(200).json(allAlumni);
    }
};

export const searchAlumniHandler = async (req: Request<{}, {}, {}, SearchAlumniSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0 } = req.query;
    const searchResult = await searchAlumni(search, +page);
    res.status(200).json(searchResult);
};
export const findAlumniByIdHandler = async (req: Request<FindUniqueAlumniSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { alumniId } = req.params;
    const applicant = await findAlumniById(alumniId);
    res.status(200).json(applicant);
};
// findTermToEnrollForStudentEnrolled
export const findTermToEnrollForAlumniHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const termToEnroll = await findTermToEnrollForAlumni();
    res.status(200).json(termToEnroll);
};

export const findAlumniEnrolledSubjectsHandler = async (req: Request<FindAlumniSubjectsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { alumniId, termId } = req.params;
    if (alumniId && termId) {
        const enrolledSubjects = await findAlumniEnrolledSubjects(alumniId, termId);
        res.status(200).json(enrolledSubjects);
    }
};
// enrollAlumniToSubjects
export const enrollAlumniToSubjectsHandler = async (req: Request<{}, {}, AlumniEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const termToEnroll = await enrollAlumniToSubjects(enrollData);
    res.status(200).json(termToEnroll);
};
export const deEnrollAlumniEnrolledToSubjectsHandler = async (req: Request<{}, {}, AlumniEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const message = await deEnrollAlumniEnrolledToSubjects(enrollData);
    res.status(200).json(message);
};
export const makeAlumniToActiveByIdHandler = async (req: Request<MakeAlumniToActiveByIdSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { alumniId} = req.params;
    const updatedStudent = await makeAlumniToActiveById(alumniId);
    res.status(200).json(updatedStudent);
};