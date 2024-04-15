// routes/eventRoutes.ts
import express from 'express';
import validate from '../../../middleware/validateResource';
import { createNewEventSchema, deleteEventSchema, updateEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createEventHandler, deleteEventHandler, getAllEventsHandler, updateEventHandler } from '../../../controller/admin.controller/admin.events.controller/admin.events.controller';

const adminEventRoute = express.Router();

adminEventRoute.post('/create', validate(createNewEventSchema), protectRoute, restrict('ADMIN'), createEventHandler);
adminEventRoute.get('/events', protectRoute, restrict('ADMIN', 'STUDENT'), getAllEventsHandler);
adminEventRoute.patch('/update/:eventId', validate(updateEventSchema), protectRoute, restrict('ADMIN'), updateEventHandler);
adminEventRoute.delete('/delete/:eventId', validate(deleteEventSchema), protectRoute, restrict('ADMIN'), deleteEventHandler);

export default adminEventRoute;
