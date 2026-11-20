import { Request, Response } from 'express';
import { createFeeExemption, findStudentsForExemption, getStudentFeeExemptions, listFeeExemptions, switchOffFeeExemption } from '../../../service/admin.service/admin.fee.service/fee.exemption.service';
import { customError } from '../../../utils/customError';

/* Scope of Work item 20 (B5): fee exemption between two dates. ADMIN only. */
export const listFeeExemptionsHandler = async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.status(200).json(await listFeeExemptions(search));
};

export const getStudentFeeExemptionsHandler = async (req: Request<{ studentId: string }>, res: Response) => {
    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId)) throw customError('Student id is not valid.', 'fail', 400, true);
    res.status(200).json(await getStudentFeeExemptions(studentId));
};

export const createFeeExemptionHandler = async (req: Request, res: Response) => {
    const { studentId, startDate, endDate, reason } = req.body ?? {};
    const created = await createFeeExemption({ studentId: Number(studentId), startDate: String(startDate ?? ''), endDate: String(endDate ?? ''), reason: reason ? String(reason) : undefined }, { userId: req.user?.id, email: req.user?.email });
    res.status(201).json(created);
};

export const switchOffFeeExemptionHandler = async (req: Request<{ id: string }>, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw customError('Exemption id is not valid.', 'fail', 400, true);
    res.status(200).json(await switchOffFeeExemption(id, { userId: req.user?.id, email: req.user?.email }));
};

export const findStudentsForExemptionHandler = async (req: Request, res: Response) => {
    res.status(200).json(await findStudentsForExemption(typeof req.query.search === 'string' ? req.query.search : ''));
};
