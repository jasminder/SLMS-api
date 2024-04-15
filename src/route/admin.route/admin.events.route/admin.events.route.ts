// routes/eventRoutes.ts
import express from 'express';
import validate from '../../../middleware/validateResource';
import { createNewEventSchema } from '../../../schema/admin.dto/admin.event.dto/admin.event.dto';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { createEventHandler } from '../../../controller/admin.controller/admin.events.controller/admin.events.controller';


const adminEventRoute = express.Router();

adminEventRoute.post('/create', validate(createNewEventSchema), protectRoute, restrict('ADMIN'), createEventHandler);

export default adminEventRoute;
