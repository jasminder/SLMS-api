import { customError } from "../utils/customError";
import { NextFunction, Request, Response } from 'express';

export const restrict = (...role: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!role.includes(req.user?.role!)) {
            const error = customError('The user has no permission for this request - Forbidden', 'Fail', 403, true);
            return next(error);
        }
        next();
    };
};