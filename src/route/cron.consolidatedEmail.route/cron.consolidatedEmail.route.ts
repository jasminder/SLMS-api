// In your route file
import express from 'express';
import { sendConsolidatedEmailsHandler } from '../../controller/cron.consolidatedEmail.controller/cron.consolidatedEmail.controller';


const sendConsolidatedEmailsRouter = express.Router();

sendConsolidatedEmailsRouter.post('/send-consolidated-emails', sendConsolidatedEmailsHandler);

export default sendConsolidatedEmailsRouter;
