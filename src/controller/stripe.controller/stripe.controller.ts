import { NextFunction, Request, Response } from 'express';
import { createCheckoutSession, getStripPublishableKey } from '../../service/stripe.service/stripe.service';
import { CreateCheckoutSessionSchema } from '../../schema/stripe.dto/stripe.dto';

export const getStripePublishableKeyHandler = async (req: Request, res: Response, next: NextFunction) => {
    const SPK = await getStripPublishableKey();
    res.status(200).json(SPK);
};
export const createCheckoutSessionHandler = async (req: Request<{}, {}, CreateCheckoutSessionSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { amount, email, feePaymentId, firstName, invoiceId, invoiceName, lastName } = req.body;

    const session = await createCheckoutSession(feePaymentId, +amount, invoiceName, invoiceId, firstName, lastName, email);
    res.status(200).json(session);
};
