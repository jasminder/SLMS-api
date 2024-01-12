import { Express } from 'express-serve-static-core';
import { User } from '@prisma/client';
// Define types for the related entities if needed

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