// controllers/emailController.js
import { Request, Response } from 'express';
import { sendEmailWithAttachment } from '../../../service/homework.service/homework.sendmail.service/homework.sendmail.service';
import { SendEmailSchema } from '../../../schema/homework.dto/homework.sendmail.dto/homework.sendmail.dto';

export const sendEmailWithAttachmentHandler = async (req: Request<{}, {}, SendEmailSchema['body'], {}>, res: Response) => {
    const { recipients, subject, text, attachmentUrl } = req.body;
    await sendEmailWithAttachment(recipients, subject, text, attachmentUrl);
    res.status(200).json({ message: 'Email sent successfully' });
};
