import express from 'express';
import { asyncErrorHandler } from '../../../utils/asyncErrorHandler';
import { protectRoute } from '../../../middleware/protectRoutes';
import { restrict } from '../../../middleware/restrict';
import { getInteractionsHandler } from '../../../controller/admin.controller/admin.interactions.controller/admin.interactions.controller';

const interactionRoute = express.Router();

// Route for fetching interactions for a specific student
interactionRoute.route('/get-interactions-student/:studentId').get(protectRoute, restrict('ADMIN'), asyncErrorHandler(getInteractionsHandler));

export default interactionRoute;
