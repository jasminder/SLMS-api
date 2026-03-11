import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { customError } from '../utils/customError';
import { DecodeToken } from '../types/type';
import { asyncErrorHandler } from '../utils/asyncErrorHandler';
import { existingAuthUser } from '../service/auth.service/auth.service';

type Admin = {
    id: number | undefined;
    // Add other fields from Admin if needed
};

type Teacher = {
    id: number | undefined;
    // Add other fields from Teacher if needed
};

type Student = {
    id: number | undefined;
    // Add other fields from Student if needed
};

export interface UserType {
    id: number;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    isEmailVerified: boolean;
    admin?: Admin | null;
    teacher?: Teacher | null;
    student?: Student | null;
}
// Auth middleware for Route protection
declare module 'express-serve-static-core' {
    interface Request {
        user?: UserType;
    }
}
export const protectRoute = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check whether Token exists
    const authHeadersValue = req.headers.authorization;
    let token;
    if (authHeadersValue && authHeadersValue.startsWith('Bearer')) {
        token = authHeadersValue.split(' ')[1] as string;
    }
    if (!authHeadersValue) {
        throw customError('No token available', 'fail', 401, true);
    }

    // 2. Validate the jwt token (return 401 for expired/invalid so client can refresh)
    jwt.verify(token as string, process.env.SECRET_STR! as string, async (err: any, decoded: any) => {
        if (err) {
            const statusCode = err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' ? 401 : 403;
            const error = customError(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 'fail', statusCode, true);
            return next(error);
        }
        const decodedToken = decoded as DecodeToken;
        const existingUser = await existingAuthUser(decodedToken.email, decodedToken.role);

        if (!existingUser) {
            const error = customError('No such user with this token exists @ksm', 'fail', 401, true);
            return next(error);
        }
        req.user = existingUser;
        next();
    });
});
