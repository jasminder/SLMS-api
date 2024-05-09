import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { customError } from '../utils/customError';

const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body, 'url inside req.body');
    // console.log(req.params, 'url inside req.params');
    // console.log(req.query, 'url inside req.query');
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params
        });
        next();
    } catch (e: any) {
        if (process.env.NODE_ENV === 'development') {
            const error = customError(`Validation error : ${e}`, 'fail', 400, false);
            console.log(e);
            return next(error);
        } else {
            const error = customError(`Something went wrong:Validation`, 'fail', 500, false);
            return next(error);
        }
    }
};

export default validate;
