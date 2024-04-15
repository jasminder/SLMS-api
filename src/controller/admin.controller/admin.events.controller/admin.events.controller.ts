import { NextFunction, Request, Response } from 'express';
import { createEvent } from '../../../service/admin.service/admin.events.service/admin.events.service';
import { CreateNewEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';

export const createEventHandler = async (req: Request<{}, {}, CreateNewEventSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { start, end, data } = req.body;
    const event = await createEvent(start, end, data);
    res.status(201).json(event);
};
