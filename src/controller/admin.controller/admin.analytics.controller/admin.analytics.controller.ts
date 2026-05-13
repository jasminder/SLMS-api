import { NextFunction, Request, Response } from 'express';
import {
    getActiveStudentsPerSubject,
    getExpectedStudentCountPerWeekday,
    getGenderDistributionForCurrentTerm,
    getPresentAttendances,
    getStudentsCountPerTerm,
    getWeekdayPresentAttendances
} from '../../../service/admin.service/admin.analytics.service/admin.analytics.service';
import { ActiveStudentsPerSubjectSchema } from '../../../schema/admin.dto/admin.analytics.dto/admin.analytics.dto';

export const getActiveStudentsPerSubjectHandler = async (req: Request, res: Response, next: NextFunction) => {
    const activeStudentsPerSubject = await getActiveStudentsPerSubject();
    res.status(200).json(activeStudentsPerSubject);
};
export const getPresentAttendanceHandler = async (req: Request, res: Response, next: NextFunction) => {
    const presentAttendances = await getPresentAttendances();
    res.status(200).json(presentAttendances);
};
export const getStudentsPerTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const studentsPerTerm = await getStudentsCountPerTerm();
    res.status(200).json(studentsPerTerm);
};
export const getGenderDistributionForCurrentTermHandler = async (req: Request, res: Response, next: NextFunction) => {
    const genderDistribution = await getGenderDistributionForCurrentTerm();
    res.status(200).json(genderDistribution);
};
/*********** */
export const getWeekdayPresentAttendancesHandler = async (req: Request, res: Response, next: NextFunction) => {
    const presentAttendances = await getWeekdayPresentAttendances();
    res.status(200).json(presentAttendances);
};
export const getExpectedStudentCountPerWeekdayHandler = async (req: Request, res: Response, next: NextFunction) => {
    const counts = await getExpectedStudentCountPerWeekday();
    res.status(200).json(counts);
};