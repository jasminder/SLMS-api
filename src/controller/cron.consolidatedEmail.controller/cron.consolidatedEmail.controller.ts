import { NextFunction, Request, Response } from 'express';
import { consolidateStudentDataForEmail } from '../../service/cron.service/cron.consolidatedEmail.service/cron.consolidatedEmail.service';
// In your controller file
export const sendConsolidatedEmailsHandler = async (req: Request, res: Response, next: NextFunction) => {

    try {
        await consolidateStudentDataForEmail();
        res.status(200).json({ message: 'Consolidated emails sent successfully' });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};
