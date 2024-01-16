import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { existingAuthUser, loginUser, signUpUser } from '../../service/auth.service/auth.service';
import { LoginUserUserSchema, SignupUserSchema } from '../../schema/auth.dto/auth.dto';
import { customError } from '../../utils/customError';
import { DecodeToken } from '../../types/type';

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
export const loginUserHandler = async (req: Request<{}, {}, LoginUserUserSchema['body'], {}>, res: Response, next: NextFunction) => {
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
export const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
    const cookie = req.cookies.refreshToken;
    if (process.env.NODE_ENV === 'development') {
        console.log(cookie, '<<== cookie  in refrseh ep');
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
