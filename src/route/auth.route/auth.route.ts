import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { loginUserSchema, signupUserSchema } from '../../schema/auth.dto/auth.dto';
import { loginUserHandler, logout, refreshHandler, signUpUserHandler } from '../../controller/auth.controller/auth.controller';

const authRoute = express.Router();
/*sign up user*/
authRoute.route('/signup-user').post(validate(signupUserSchema), asyncErrorHandler(signUpUserHandler));
/*login  user*/
authRoute.route('/login-user').post(validate(loginUserSchema), asyncErrorHandler(loginUserHandler));
/*logout  user*/
authRoute.route('/logout-user').post(asyncErrorHandler(logout));
/*refresh access token for authed user*/
authRoute.route('/refresh').get(asyncErrorHandler(refreshHandler));

export default authRoute;
