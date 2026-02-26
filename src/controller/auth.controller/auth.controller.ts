import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
    existingAuthUser,
    existingUserForgotPassword,
    existingUserForgotPasswordSendMailError,
    findUserByResetToken,
    loginUser,
    resetUserPassword,
    signUpUser
} from '../../service/auth.service/auth.service';
import { ForgotPasswordSchema, LoginUserSchema, ResetPasswordSchema, SignupUserSchema } from '../../schema/auth.dto/auth.dto';
import { customError } from '../../utils/customError';
import { DecodeToken } from '../../types/type';
import { sendEmail } from '../../utils/email';

export const signUpUserHandler = async (req: Request<{}, {}, SignupUserSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { confirmPassword, email, password } = req.body;
    const newUser = await signUpUser(email, password, confirmPassword);
    const { accessToken, refreshToken, user } = newUser;
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        // signed:true,
        secure: process.env.NODE_ENV === 'production', // Ensure this aligns with your cookie settings
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'none', // Ensure this aligns with your cookie settings
        maxAge: 1 * 24 * 60 * 60 * 1000 // this should match with the refresh token's expiry
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
        maxAge: 72000 * 1000 // this should match with the refresh token's expiry
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
                            expiresIn: '10s' // Adjust the expiration as needed
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
    // 1. Get the user's email from req.user.email
    // 2. Create a random password reset token
    const { email } = req.body;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const existingUser = await existingUserForgotPassword(email, resetToken);

    // 3. send email to user with the reset token and the reset URL or api? to reset password
    const resetUrl = `${process.env.CLIENT_URL}/forgot-password/${resetToken}`;

    const subject = `Reset your Password at Akal Shaouni`;
    const text = `We have received a request to reset your password. Please visit ${resetUrl} to complete the reset. This link is valid for 1 hour.`;
    try {
        if (existingUser) {
            const resonse = await sendEmail({
                email: existingUser?.email,
                subject,
                text
            });
            res.status(201).json({ status: 'success', message: 'Reset Password link send' });
        } else {
            res.json('no such user');
        }
    } catch (err) {
        console.log(err);
        existingUserForgotPasswordSendMailError(email);
        throw customError('Connot reset password. try again later.', 'fail', 404, true);
    }
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
