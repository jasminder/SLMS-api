import { NextFunction, Request, Response } from 'express';

import {
    changeCurrentTermName,
    createNewTermSetup,
    deleteTerm,
    endCurrentTerm,
    extendCurrentTerm,
    findCurrentTerm,
    findAllGroups,
    findAllLevels,
    findAllStudentsInATerm,
    findAllSubjects,
    findAllTerm,
    findUniqueTerm,
    makeCurrentTerm,
    makePublishTerm,
    findPublishTermAdministration,
    unPublishTerm,
    findCurrentTermForeFilter,
    findSchoolDaysToday,
    changeIsOnSunday,
    changeIsOnWeekday,
    findTermForSetup
} from '../../../service/admin.service/admin.administration.service/admin.administration.service';
import {
    ChangeCurrentTermNameSchema,
    ChangeIsOnSundaySchema,
    ChangeIsOnWeekdaySchema,
    CreateNewTermSetupSchema,
    ExtendCurrentTermSchema,
    FindAllStudentsInATermSchema,
    FindUniqueTermSchema
} from '../../../schema/admin.dto/admin.administration.dto/admin.administration.dto';

export const findUniqueTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const currentTerm = await findUniqueTerm(id);
    res.status(200).json(currentTerm);
};
export const findTermForSetupHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const term = await findTermForSetup(id);
    res.status(200).json(term);
};

export const findAllTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allTerms = await findAllTerm();
    res.status(200).json(allTerms);
};

export const endTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const updatedTerm = await endCurrentTerm(id);
    res.status(200).json(updatedTerm);
};
export const makeCurrentTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const updatedTerm = await makeCurrentTerm(id);
    res.status(200).json(updatedTerm);
};
export const makePublishTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const updatedTerm = await makePublishTerm(id);
    res.status(200).json(updatedTerm);
};
export const unPublishTermTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const updatedTerm = await unPublishTerm(id);
    res.status(200).json(updatedTerm);
};
export const extendCurrentTermHandler = async (req: Request<ExtendCurrentTermSchema['params'], {}, ExtendCurrentTermSchema['body'], {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const termData = req.body.updatedTerm;
    const updatedTerm = await extendCurrentTerm(id, termData);
    res.status(200).json(updatedTerm);
};
export const changeCurrentTermNameHandler = async (req: Request<ChangeCurrentTermNameSchema['params'], {}, ChangeCurrentTermNameSchema['body'], {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const termData = req.body.updatedTerm;
    const updatedTerm = await changeCurrentTermName(id, termData);
    res.status(200).json(updatedTerm);
};
export const deleteTermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const deletedTerm = await deleteTerm(id);
    res.status(200).json({ message: 'The Term is deleted', deletedTerm });
};
export const createNewTermSetupHandler = async (req: Request<{}, {}, CreateNewTermSetupSchema['body'], {}>, res: Response, next: NextFunction) => {
    const setupOrgData = req.body;
    const newTermwithSubjects = await createNewTermSetup(setupOrgData);
    res.status(200).json(newTermwithSubjects);
};

export const findAllGroupsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allGroups = await findAllGroups();
    res.status(200).json(allGroups);
};
export const findAllSubjectsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allSubjects = await findAllSubjects();
    res.status(200).json(allSubjects);
};
export const findAllLevelsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allLevels = await findAllLevels();
    res.status(200).json(allLevels);
};

// find students in a term
export const findAllStudentsInATermHandler = async (req: Request<FindUniqueTermSchema['params'], {}, {}, FindAllStudentsInATermSchema['query']>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const { page } = req.query;
    if (page) {
        const studentsListInATerm = await findAllStudentsInATerm(id, +page);
        res.status(200).json(studentsListInATerm);
    } else {
        const page = 0;
        const studentsListInATerm = await findAllStudentsInATerm(id, page);
        res.status(200).json(studentsListInATerm);
    }
};

//find current term
export const findCurrentTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const activeTerm = await findCurrentTerm();
    res.status(200).json(activeTerm);
};
//find current term
export const findCurrentTermForeFilterHandler = async (req: Request, res: Response, next: NextFunction) => {
    const activeTermForFilter = await findCurrentTermForeFilter();
    res.status(200).json(activeTermForFilter);
};

//find pusblished term
export const findPublishTermAdministrationHandler = async (req: Request, res: Response, next: NextFunction) => {
    const activeTerm = await findPublishTermAdministration();
    res.status(200).json(activeTerm);
};

export const findSchoolDaysTodayHandler = async (req: Request, res: Response, next: NextFunction) => {
    const schoolDaysToday = await findSchoolDaysToday();
    res.status(200).json(schoolDaysToday);
};
export const changeIsOnSundayHandler = async (req: Request<ChangeIsOnSundaySchema['params'], {}, ChangeIsOnSundaySchema['body'], {}>, res: Response, next: NextFunction) => {
    const { termSubjectId } = req.params;
    const { isOnSunday } = req.body;
    const updatedTermSubject = await changeIsOnSunday(termSubjectId, isOnSunday);
    res.status(200).json(updatedTermSubject);
};

export const changeIsOnWeekdayHandler = async (req: Request<ChangeIsOnWeekdaySchema['params'], {}, ChangeIsOnWeekdaySchema['body'], {}>, res: Response, next: NextFunction) => {
    const { termSubjectId } = req.params;
    const { isOnWeekday } = req.body;

    const updatedTermSubject = await changeIsOnWeekday(termSubjectId, isOnWeekday);
    res.status(200).json(updatedTermSubject);
};
