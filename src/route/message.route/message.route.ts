import express from 'express';
import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import { createMessageSchema, fetchAdminMessageSchema, fetchMessageSchema } from '../../schema/message.dto/message.dto';
import { getMessagesForAdminHandler, getMessagesForStudentHandler, sendMessageHandler } from '../../controller/message.controller/message.controller';
const messageAdminStudentRoute = express.Router();

messageAdminStudentRoute.route('/send').post(validate(createMessageSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(sendMessageHandler));
messageAdminStudentRoute.route('/messages-student/:studentId').get(validate(fetchMessageSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getMessagesForStudentHandler));
messageAdminStudentRoute.route('/messages-admin/:adminId').get(validate(fetchAdminMessageSchema), protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getMessagesForAdminHandler));

export default messageAdminStudentRoute;
