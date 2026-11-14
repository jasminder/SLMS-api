import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
    existingAuthUser,
    existingUserForgotPassword,
    existingUserForgotPasswordSendMailError,
    findUserByResetToken,
    hasProfileWithoutLogin,
    loginUser,
    resetUserPassword,
    signUpUser
} from '../../service/auth.service/auth.service';
import { ForgotPasswordSchema, LoginUserSchema, ResetPasswordSchema, SignupUserSchema } from '../../schema/auth.dto/auth.dto';
import { customError } from '../../utils/customError';
import { DecodeToken } from '../../types/type';
import { sendEmail } from '../../utils/email';

const isPlaceholderClientUrl = (value: string): boolean => {
    try {
        const host = new URL(value).hostname.toLowerCase();
        return host.endsWith('.test.org') || host === 'test.org' || host === 'localhost';
    } catch (_) {
        return true;
    }
};

const resolveClientUrl = (req: Request): string => {
    const rawClientUrl = process.env.CLIENT_URL?.trim();
    if (rawClientUrl && !isPlaceholderClientUrl(rawClientUrl)) {
        return rawClientUrl.replace(/\/+$/, '');
    }

    const host = req.get('host');
    if (host) {
        return `${req.protocol}://${host}`.replace(/\/+$/, '');
    }

    return 'https://akaal.wspclients.com';
};

export const signUpUserHandler = async (req: Request<{}, {}, SignupUserSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { confirmPassword, email, password } = req.body;
    const newUser = await signUpUser(email, password, confirmPassword);
    const { accessToken, refreshToken, user } = newUser;
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        // signed:true,
        secure: process.env.NODE_ENV === 'production', // Ensure this aligns with your cookie settings
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none', // Ensure this aligns with your cookie settings
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90d — must match the refresh token's expiry
        // maxAge: 20 * 1000000000
    });
    res.status(201).json({
        status: 'Success',
        user: user,
        accessToken,
        email: user.email,
        role: user.role,
        message: `user account for ${newUser.user.email} is created`
    });
};
export const loginUserHandler = async (req: Request<{}, {}, LoginUserSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const { accessToken, refreshToken, loggedInUser: user } = await loginUser(email, password);
    // res.cookie('refreshToken', refreshToken, {
    //     httpOnly: true,
    //     // signed:true,
    //     secure: process.env.NODE_ENV === 'production', // Ensure this aligns with your cookie settings
    //     sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none', // Ensure this aligns with your cookie settings
    //     maxAge: 600 // this should match with the refresh token's expiry
    //     // maxAge: 1 * 24 * 60 * 60 * 1000 // this should match with the refresh token's expiry
    //     // maxAge: 20 * 1000000000
    // });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true, //accessible only by web server
        secure: process.env.NODE_ENV != 'development', //https
        // signed:true,
        sameSite: 'strict', //cross-site cookie
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90d — must match the refresh token's expiry
    });
    res.status(201).json({
        status: 'Success',
        user: user,
        accessToken,
        email: user?.email,
        role: user?.role,
        message: `user account for ${user?.email} is loggedin`
    });
};
export const logout = async (req: Request, res: Response) => {
    // Check for the presence of the refreshToken cookie
    const cookie = req.cookies['refreshToken'];
    if (process.env.NODE_ENV === 'development') console.log({ cookie });
    if (!cookie) {
        return res.status(204).json({ message: 'No cookie available' });
    }

    // Clear the refreshToken cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({ message: 'Logged out. Cookie cleared.' });
};

/*get access token while refresh token is active*/
export const refreshHandler1 = async (req: Request, res: Response, next: NextFunction) => {
    const cookie = req.cookies.refreshToken;
    if (process.env.NODE_ENV === 'development') {
    }
    if (!cookie) {
        const error = customError(' No refresh Token available in cokkie. . @ksm', 'fail', 400, true);
        return next(error);
    }
    const refreshToken = cookie;

    let decodedRefreshToken: DecodeToken;
    jwt.verify(refreshToken as string, process.env.REFRESH_SECRET_STR! as string, async (err: any, decoded: any) => {
        if (err) {
            const error = customError('Invalid or expired refresh token @ksm', 'fail', 403, true);
            return next(error);
        }
        decodedRefreshToken = decoded;

        const existingUser = await existingAuthUser(decodedRefreshToken.email, decodedRefreshToken.role);

        const newAccessToken = jwt.sign({ email: existingUser.email, role: existingUser.role, id: existingUser.id }, process.env.SECRET_STR!, {
            expiresIn: '10s'
        });

        res.status(200).json({
            status: 'Success',
            user: existingUser,
            accessToken: newAccessToken,
            email: existingUser?.email,
            role: existingUser?.role,
            message: `${existingUser.email} give access token since refresh token valid`
        });
    });
};

export const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cookie = req.cookies.refreshToken;
        if (!cookie) {
            throw customError('No refresh Token available in cookie. @ksm', 'fail', 400, true);
        }

        const refreshToken = cookie;

        jwt.verify(refreshToken, process.env.REFRESH_SECRET_STR!, (err:any, decoded:any) => {
            try {
                if (err) {
                    throw customError('Invalid or expired refresh token @ksm', 'fail', 403, true);
                }

                const decodedRefreshToken = decoded;
                existingAuthUser(decodedRefreshToken.email, decodedRefreshToken.role)
                    .then((existingUser) => {
                        const newAccessToken = jwt.sign({ email: existingUser.email, role: existingUser.role, id: existingUser.id }, process.env.SECRET_STR!, {
                            expiresIn: '600s'
                        });

                        // Rotate the refresh token so an active session keeps sliding the 90d window
                        const newRefreshToken = jwt.sign({ email: existingUser.email, role: existingUser.role, id: existingUser.id }, process.env.REFRESH_SECRET_STR!, {
                            expiresIn: '90d'
                        });
                        res.cookie('refreshToken', newRefreshToken, {
                            httpOnly: true,
                            secure: process.env.NODE_ENV != 'development',
                            sameSite: 'strict',
                            maxAge: 90 * 24 * 60 * 60 * 1000 // 90d — must match the refresh token's expiry
                        });

                        res.status(200).json({
                            status: 'Success',
                            user: existingUser,
                            accessToken: newAccessToken,
                            email: existingUser.email,
                            role: existingUser.role,
                            message: `${existingUser.email} given access token since refresh token is valid`
                        });
                    })
                    .catch((userError) => {
                        throw userError;
                    });
            } catch (callbackError) {
                next(callbackError);
            }
        });
    } catch (outerError) {
        next(outerError);
    }
};
//************** Forgot Password **************
export const forgotPasswordHandler = async (req: Request<{}, {}, ForgotPasswordSchema['body'], {}>, res: Response, next: NextFunction) => {
    // Used by the parent "Forgot Password" pages (web + app) AND the admin/portal "Send Password Reset Email" buttons.
    // 1. Normalise the email the user typed (trim + lowercase)
    // 2. Create a random password reset token
    const email = req.body.email.trim().toLowerCase();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const existingUser = await existingUserForgotPassword(email, resetToken);
    const clientUrl = resolveClientUrl(req);

    if (!existingUser) {
        // Be honest with the caller instead of pretending a link was sent.
        if (await hasProfileWithoutLogin(email)) {
            throw customError(
                `No account found for this email yet. If this is your first time, please sign up at ${clientUrl}/signup, or contact the school office.`,
                'fail',
                404,
                true
            );
        }
        throw customError('No account found for this email. Please check the address or contact the school office.', 'fail', 404, true);
    }

    // 3. send email to user with the reset token and the reset URL to reset password
    const resetUrl = `${clientUrl}/forgot-password/${resetToken}`;
    const subject = `Reset your Password at Akal Shaouni`;
    const text = `We have received a request to reset your password. Please visit ${resetUrl} to complete the reset. This link is valid for 1 hour.`;
    const sent = await sendEmail({
        email: existingUser.email,
        subject,
        text
    });
    if (!sent) {
        // Mail never left: drop the unused token so the user can simply try again.
        await existingUserForgotPasswordSendMailError(email);
        throw customError('We could not send the reset email right now. Please try again later or contact the school office.', 'fail', 503, true);
    }
    res.status(201).json({ status: 'success', message: 'Reset Password link send' });
};
export const resetPasswordHandler = async (req: Request<ResetPasswordSchema['params'], {}, ResetPasswordSchema['body'], {}>, res: Response, next: NextFunction) => {
    const token = req.params.token;

    const result = await findUserByResetToken(token);

    if (result.expired) {
        throw customError('This reset link has expired. Please request a new password reset link.', 'fail', 410, true);
    }
    if (!result.user) {
        throw customError('Invalid or used reset link. Please request a new password reset.', 'fail', 404, true);
    }

    const existingUser = result.user;
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
        const error = customError('Password or confirm password not provided @ksm', 'fail', 400, true);
        return next(error);
    }
    if (password != confirmPassword) {
        const error = customError('Password and confirm password does not match Please try again', 'fail', 400, true);
        return next(error);
    }
    await resetUserPassword(existingUser.email, password);

    res.status(200).json({ existingUser });
};
