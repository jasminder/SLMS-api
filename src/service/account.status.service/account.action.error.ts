/**
 * Error for admin account/password actions that must be shown to the admin as they are
 * (HTTP status + a stable `code` the UI can rely on). Controllers turn it into a JSON response.
 */
export type AccountActionCode =
    | 'TEACHER_NOT_FOUND'
    | 'STUDENT_NOT_FOUND'
    | 'NO_ACCOUNT'
    | 'ACCOUNT_CONFLICT'
    | 'LOGIN_NOT_AVAILABLE'
    | 'NOT_ELIGIBLE'
    | 'AMBIGUOUS_EMAIL'
    | 'NO_EMAIL'
    | 'EMAIL_NOT_SENT'
    | 'SETUP_PENDING'
    | 'LOGIN_ALREADY_EXISTS'
    | 'LOGIN_EMAIL_INVALID'
    | 'LOGIN_EMAIL_IN_USE'
    | 'LOGIN_EMAIL_BELONGS_TO_PROFILE'
    | 'OWNERSHIP_NOT_CONFIRMED'
    | 'SETUP_EMAIL_NOT_SENT';

export class AccountActionError extends Error {
    status = 'fail';
    isOperational = true;
    statusCode: number;
    code: AccountActionCode;

    constructor(statusCode: number, code: AccountActionCode, message: string) {
        super(message);
        Object.setPrototypeOf(this, AccountActionError.prototype);
        this.name = 'AccountActionError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
