// routes/homeworkRoutes.js
import express from 'express';
import validate from '../../../middleware/validateResource';
import { sendEmailSchema } from '../../../schema/homework.dto/homework.sendmail.dto/homework.sendmail.dto';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { sendEmailWithAttachmentHandler } from '../../../controller/homework.controller/homework.sendmail.controller/homework.sendmail.controller';

const sendMailHomeWorkRouter = express.Router();

sendMailHomeWorkRouter.route('/home-work').post(validate(sendEmailSchema), asyncErrorHandler(sendEmailWithAttachmentHandler));

export default sendMailHomeWorkRouter;
