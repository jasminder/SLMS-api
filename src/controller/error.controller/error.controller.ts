import express, { Express, NextFunction, Request, Response } from 'express';

import { Err } from '../../types/type';

const devErrors = (err: any, res: Response) => {
    res.status(err.statusCode).json({ status: err.status, message: `${err.message}`, stackTrace: err.stack, error: err });
};
const prodErrors = (err: Err, res: Response) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({ status: err.status, message: err.message });
    } else {
        res.status(500).json({
            status: 'error',
            message: 'something went wrong. try again later'
        });
    }
};
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.statusCode >= 400 && err.statusCode < 500 ? 'Fail' : 'server error';
    Error.captureStackTrace(err);
    if (process.env.NODE_ENV === 'development') devErrors(err, res);
    else if (process.env.NODE_ENV === 'production') {
        prodErrors(err, res);
    }
};
