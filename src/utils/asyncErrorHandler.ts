import express, { Request, Response, NextFunction } from 'express';
import { Err } from '../types/type';

export const asyncErrorHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch((err: Err) => {
        // console.log(err)
        return next(err);
    });
