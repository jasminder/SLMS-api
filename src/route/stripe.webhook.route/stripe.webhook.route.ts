import express from 'express';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

import { stripeWebhookHandlerHandler } from '../../controller/stripe.controller/stripe.controller';

import validateStripeWebhook from '../../middleware/validateWebhook';

const stripeWebhookRoute = express.Router();
stripeWebhookRoute.route('/webhook').post(validateStripeWebhook, stripeWebhookHandlerHandler);

export default stripeWebhookRoute;
