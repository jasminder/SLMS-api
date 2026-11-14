import express, { Request, Response } from 'express';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { readAppContext } from '../../service/app.install.service/app.install.rules';
import { recordAppActivitySafely } from '../../service/app.install.service/app.install.service';

/* Scope of Work item 25: the app calls this when it opens or comes back to the front. Any signed-in account. */
const appActivityRoute = express.Router();

appActivityRoute.route('/ping').post(
    protectRoute,
    asyncErrorHandler(async (req: Request, res: Response) => {
        await recordAppActivitySafely(req.user?.id, readAppContext(req.headers), 'open');
        res.status(204).end();
    })
);

export default appActivityRoute;
