import { NextFunction, Request, Response } from 'express';
import { createTimetable, findActiveTimetable, updateTimetable } from '../../../service/admin.service/admin.administration.service/admin.timetable.service/admin.timetable.service';
import { TimeTableSchema, UpdateTimeTableSchema } from '../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';

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

// src/controllers/timetableController.js

// ------------------- for time table ------------------- //
export const createTimetableHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const timetableData = req.body;
        const timetable = await createTimetable(timetableData);
        res.status(201).json({
            status: 'success',
            data: { timetable }
        });
    } catch (error) {
        next(error);
    }
};
// ------------------- for time table ------------------- //
