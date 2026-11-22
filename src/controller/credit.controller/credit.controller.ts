import { Request, Response } from 'express';
import { addStudentCredit, correctStudentCredit, getStudentCreditHistory } from '../../service/credit.ledger.service/credit.ledger.service';
import { AddStudentCreditSchema, CorrectStudentCreditSchema, StudentCreditHistorySchema } from '../../schema/credit.dto/credit.dto';

const actorOf = (req: Request) => ({ userId: req.user?.id, email: req.user?.email });

export const addStudentCreditHandler = async (req: Request<AddStudentCreditSchema['params'], {}, AddStudentCreditSchema['body']>, res: Response) => {
    const entry = await addStudentCredit(+req.params.studentId, req.body, actorOf(req));
    res.status(201).json(entry);
};

export const correctStudentCreditHandler = async (req: Request<CorrectStudentCreditSchema['params'], {}, CorrectStudentCreditSchema['body']>, res: Response) => {
    const entry = await correctStudentCredit(+req.params.studentId, req.body, actorOf(req));
    res.status(201).json(entry);
};

export const getStudentCreditHistoryHandler = async (req: Request<StudentCreditHistorySchema['params']>, res: Response) => {
    res.status(200).json(await getStudentCreditHistory(+req.params.studentId));
};
