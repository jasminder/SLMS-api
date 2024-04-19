import { NextFunction, Request, Response } from 'express';
import { parse } from 'json2csv';
import { downloadStudentsCsvService, downloadTeachersCsvService } from '../../../service/admin.service/admin.csv.service/admin.csv.service';

export const downloadStudentCsvHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const students = await downloadStudentsCsvService();

        const fields = [
            'id',
            'akaalId',
            'firstName',
            'lastName',
            'DOB',
            'gender',
            'email',
            'contact',
            'address',
            'suburb',
            'state',
            'country',
            'postcode',
            'fatherName',
            'motherName',
            'parentEmail',
            'parentContact',
            'emergencyContactPerson',
            'contactNumber',
            'relationship',
            'medicareNumber',
            'ambulanceMembershipNumber',
            'medicalCondition',
            'allergy',
            'otherInfo',
            'declaration'
        ];
        const opts = { fields };
        const csv = parse(students, opts);

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
        const teachers = await downloadTeachersCsvService();

        const fields = [
            'id', 'role', 'isActive', 'isAllowedLogin', 'firstName', 'lastName', 'DOB', 'gender',
            'email', 'contact', 'address', 'suburb', 'state', 'country', 'postcode', 'contactPerson',
            'contactNumber', 'relationship', 'medicareNumber', 'medicalCondition', 'childrenCheckCardNumber',
            'workingWithChildrenCheckExpiry', 'workRights', 'immigrationStatus', 'qualification',
            'experience', 'subjectsChosen', 'timeSlotsChosen', 'bankAccountName', 'BSB', 'accountNumber',
            'ABN', 'otherInfo'
        ];
        const opts = { fields };
        const csv = parse(teachers, opts);

        res.header('Content-Type', 'text/csv');
        res.attachment('teachers-details.csv');
        res.send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating CSV file');
    }
};
