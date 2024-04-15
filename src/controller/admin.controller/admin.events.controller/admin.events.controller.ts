import { NextFunction, Request, Response } from 'express';
import { createEvent, deleteEvent, getAllEvents, updateEvent } from '../../../service/admin.service/admin.events.service/admin.events.service';
import { CreateNewEventSchema, DeleteEventSchema, UpdateEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';

export const createEventHandler = async (req: Request<{}, {}, CreateNewEventSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { start, end, data } = req.body;
    const event = await createEvent(start, end, data);
    res.status(201).json(event);
};

export const getAllEventsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const events = await getAllEvents();
    res.status(200).json(events);
};

export const updateEventHandler = async (req: Request<UpdateEventSchema['params'], {}, UpdateEventSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const { start, end, data } = req.body;
    const updatedEvent = await updateEvent(eventId, start, end, data);
    res.status(200).json(updatedEvent);
};

export const deleteEventHandler = async (req: Request<DeleteEventSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const deletedEvent = await deleteEvent(eventId);
    res.status(204).json(deletedEvent);
};
