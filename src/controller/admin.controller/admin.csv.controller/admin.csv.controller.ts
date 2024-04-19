import { NextFunction, Request, Response } from 'express';
import { parse } from 'json2csv';
import { downloadStudentsCsvService, downloadTeachersCsvService } from '../../../service/admin.service/admin.csv.service/admin.csv.service';

export const downloadStudentCsvHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const csv = await downloadStudentsCsvService(); // Get the CSV string directly

        if (!csv) {
            res.status(404).send('No data available to generate CSV.');
            return;
        }

        res.header('Content-Type', 'text/csv');
        res.attachment('students-details.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating CSV file');
    }
};

export const downloadTeacherCsvHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const csv = await downloadTeachersCsvService(); // Get the CSV string directly

        if (!csv) {
            res.status(404).send('No data available to generate CSV.');
            return;
        }

        res.header('Content-Type', 'text/csv');
        res.attachment('teacher-details.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating CSV file');
    }
};
