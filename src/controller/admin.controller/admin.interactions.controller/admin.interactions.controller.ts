import { Request, Response, NextFunction } from 'express';
import { getInteractionsByStudentId } from '../../../service/admin.service/admin.interactions.service/admin.interactions.service';
import { FindInteractionsByStudendtIdSchema,} from '../../../schema/admin.dto/admin.interactions.dto/admin.interactions.dto';


export const getInteractionsHandler = async (req: Request<FindInteractionsByStudendtIdSchema['params'],{},{},{}>, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const interactions = await getInteractionsByStudentId(studentId);
    res.status(200).json(interactions);
};
// 