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
        // const error = customError('No Token available in header/authorize. This is because the user is not logged in or token is not present in the protected route. @ksm', 'fail', 400, true);
        throw customError('TokenExpiredError', 'fail', 403, true);
    }

    // 2. Validate the jwt token
    let decodedToken!: DecodeToken;
    jwt.verify(token as string, process.env.SECRET_STR! as string, async (err: any, decoded: any) => {
        if (err) {
            const error = customError('TokenExpiredError', 'fail', 403, true);
            return next(err);
        }
        decodedToken = decoded;
        const existingUser = await existingAuthUser(decodedToken.email, decodedToken.role);

        if (!existingUser) {
            throw customError('No such user with this token exists @ksm', 'fail', 400, true);
        }
        req.user = existingUser;
        next();
    });
});
