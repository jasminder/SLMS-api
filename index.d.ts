
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
// Add your module declarations below

declare module 'node-cron' {
    // Replace with actual functions and types used from node-cron
    export function schedule(cronExpression: string, callback: () => void): any;
    // ...
}

declare module 'nodemailer' {
    // Replace with actual functions and types used from nodemailer
    export function createTransport(options: any): any;
    // ...
}

declare module 'bcrypt' {
    // Replace with actual functions and types used from bcrypt
    export function hash(password: string, saltOrRounds: number | string): Promise<string>;
    export function compare(data: string, encrypted: string): Promise<boolean>;
    // ...
}