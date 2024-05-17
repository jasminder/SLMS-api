import stripe from 'stripe';
import { Request, Response, NextFunction } from 'express';
import { customError } from '../utils/customError';
const Stripe = require('stripe')(process.env.STRIPE_SECRET_KEY as string);
declare module 'express-serve-static-core' {
    interface Request {
        event?: stripe.Event;
    }
}

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });
const validateStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    let event = req.body;
    if (process.env.STRIPE_WEBHOOK_SECRET as string) {
        const sig = req.headers['stripe-signature'];
        console.log(sig);
        try {
            event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
            console.log(req.event, 'validate webhook');
            next();
        } catch (err: any) {
            console.log(req.event, 'ERROR validate webhook');
            console.error(`Webhook Error: ${err.message}`);
            res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }
};

export default validateStripeWebhook;
