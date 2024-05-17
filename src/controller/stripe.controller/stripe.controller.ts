import { NextFunction, Request, Response } from 'express';
import { createCheckoutSession, getStripPublishableKey, handlePaymentFailure, handlePaymentSuccess } from '../../service/stripe.service/stripe.service';
import { CreateCheckoutSessionSchema } from '../../schema/stripe.dto/stripe.dto';
import Stripe from 'stripe';

declare module 'express-serve-static-core' {
    interface Request {
        event?: Stripe.Event;
    }
}
export const getStripePublishableKeyHandler = async (req: Request, res: Response, next: NextFunction) => {
    const SPK = await getStripPublishableKey();
    res.status(200).json(SPK);
};
export const createCheckoutSessionHandler = async (req: Request<{}, {}, CreateCheckoutSessionSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { amount, email, feePaymentId, firstName, invoiceId, invoiceName, lastName } = req.body;

    const session = await createCheckoutSession(feePaymentId, +amount, invoiceName, invoiceId, firstName, lastName, email);
    res.status(200).json(session);
};
export const stripeWebhookHandlerHandler = async (req: Request, res: Response, next: NextFunction) => {
    const event = req.event;
    switch (event?.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event?.data.object;
            handlePaymentSuccess(paymentIntent);
            break;
        case 'payment_intent.payment_failed':
            const failedIntent = event?.data.object;
            handlePaymentFailure(failedIntent);
            break;
        default:

            console.log(`Unhandled event type ${event?.type}`);
    }

    res.json({ received: true });
};
