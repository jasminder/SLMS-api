import stripe from 'stripe';
import { Request, Response, NextFunction } from 'express';
import { customError } from '../utils/customError';

declare module 'express-serve-static-core' {
    interface Request {
        event?: stripe.Event;
    }
}

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });
const validateStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers['stripe-signature'];
    if (!sig || Array.isArray(sig)) {
        return res.status(400).send('Invalid Stripe signature.');
    }
    try {
        req.event = stripeInstance.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
        next();
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

export default validateStripeWebhook;
