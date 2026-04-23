import { NextFunction, Request, Response } from 'express';
import {
    createSchoolTimetable,
    createTimetable,
    fetchActiveTimetable,
    fetchEditTimetable,
    findActiveTimetable,
    updateSchoolTimetable,
    updateTimetable,
    fetchAllTimetablesData,
    fetchStudentsInSameClassForTimetable,
    fetchStudentTimetable,
    fetchStudentAllTimetables
} from '../../../service/admin.service/admin.administration.service/admin.timetable.service/admin.timetable.service';
import {
    CreateSchoolTimetableSchema,
    FetchStudentsInSameClassForTimetableSchema,
    FetchStudentAllTimetablesSchema,
    FetchStudentTimetableSchema,
    FetchTimetableSchema,
    TimeTableSchema,
    UpdateSchoolTimetableSchema,
    UpdateTimeTableSchema
} from '../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { Day } from '@prisma/client';

export const createTimeTablesHandler = async (req: Request<{}, {}, TimeTableSchema['body'], {}>, res: Response, next: NextFunction) => {
    const createTimetableData = req.body;
    const newTimetable = await createTimetable(createTimetableData);
    res.status(200).json(newTimetable);
};
export const findActiveTimetableHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const currentTimetable = await findActiveTimetable();
    res.status(200).json(currentTimetable);
};
export const updateTimetableHandler = async (req: Request<UpdateTimeTableSchema['params'], {}, UpdateTimeTableSchema['body'], {}>, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const editTimetableData = req.body;
    const updatedTimetable = await updateTimetable(id, editTimetableData);
    res.status(200).json({ updatedTimetable });
};

// ------------------- for time table ------------------- //
export const createSchoolTimetableHandler = async (req: Request<{}, {}, CreateSchoolTimetableSchema['body'], {}>, res: Response, next: NextFunction) => {
    try {
        const timetableData = req.body.createSchoolTimetableData;
        // console.log('timetableData at controller', JSON.stringify(timetableData, null, 2));
        const timetable = await createSchoolTimetable(timetableData);
        res.status(201).json({
            status: 'success',
            data: { timetable }
        });
    } catch (error) {
        next({ error: error });
    }
};

export const fetchActiveTimetableHandler = async (req: Request<FetchTimetableSchema['params']>, res: Response, next: NextFunction) => {
    try {
        const { day } = req.params;
        const timetable = await fetchActiveTimetable(day as Day);
        res.status(200).json(timetable);
    } catch (error) {
        next(error);
    }
};

export const fetchEditTimetableHandler = async (req: Request<FetchTimetableSchema['params']>, res: Response, next: NextFunction) => {
    try {
        const { day } = req.params;
        const timetable = await fetchEditTimetable(day as Day);
        res.status(200).json(timetable);
    } catch (error) {
        next(error);
    }
};

export const updateSchoolTimetableHandler = async (req: Request<UpdateSchoolTimetableSchema['params'], {}, UpdateSchoolTimetableSchema['body'], {}>, res: Response, next: NextFunction) => {
    try {
        const timetableId = req.params.timetableId;
        const timetableData = req.body.updateTimetableData;
        const updatedTimetable = await updateSchoolTimetable(timetableId, timetableData);
        res.status(200).json({
            status: 'success',
            data: { timetable: updatedTimetable }
        });
    } catch (error) {
        next({ error: error });
    }
};
export const fetchStudentsInSameClassForTimetableHandler = async (req: Request<FetchStudentsInSameClassForTimetableSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { termSubjectLevelId, sectionId } = req.params;
    const students = await fetchStudentsInSameClassForTimetable(termSubjectLevelId, sectionId);
    res.status(200).json(students);
};
// ------------------- for time table ------------------- //

export const fetchStudentAllTimetablesHandler = async (req: Request<FetchStudentAllTimetablesSchema['params']>, res: Response, next: NextFunction) => {
    try {
        const { studentId } = req.params;
        const timetables = await fetchStudentAllTimetables(studentId);
        res.status(200).json(timetables);
    } catch (error) {
        next(error);
    }
};

export const fetchStudentTimetableHandler = async (req: Request<FetchStudentTimetableSchema['params']>, res: Response, next: NextFunction) => {
    try {
        const { studentId, day } = req.params;
        const timetable = await fetchStudentTimetable(studentId, day as import('@prisma/client').Day);
        res.status(200).json(timetable);
    } catch (error) {
        next(error);
    }
};

// New controller function to fetch all timetables data
export const fetchAllTimetablesDataHandler = async (req: Request, res: Response, next: NextFunction) => {
    const allTimetables = await fetchAllTimetablesData();
    res.status(200).json(allTimetables);
};
