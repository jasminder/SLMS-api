import express from 'express';
import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import { createCheckoutSessionHandler, getStripePublishableKeyHandler } from '../../controller/stripe.controller/stripe.controller';
import { createCheckoutSessionSchema } from '../../schema/stripe.dto/stripe.dto';

const stripeRoute = express.Router();

stripeRoute.route('/checkout-session').post(validate(createCheckoutSessionSchema), protectRoute, asyncErrorHandler(createCheckoutSessionHandler));
stripeRoute.route('/get-config-SPK').get(protectRoute, restrict('ADMIN', 'STUDENT'), asyncErrorHandler(getStripePublishableKeyHandler));
stripeRoute.route('/webhook').get();

export default stripeRoute;
