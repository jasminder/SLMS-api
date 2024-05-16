import Stripe from 'stripe';
import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';

export const getStripPublishableKey = async () => {
    const SPK = process.env.STRIPE_PUBLISHABLE_KEY;
    return SPK;
};

export const createCheckoutSession = async (feePaymentId: string, amount: number, invoiceName: string, invoiceId: string, firstName: string, lastName: string, email: string) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
        customer_email: email,
        client_reference_id: invoiceId,
        line_items: [
            {
                price_data: {
                    currency: 'aud',
                    unit_amount: amount * 100,
                    product_data: {
                        name: invoiceName
                    }
                },
                quantity: 1
            }
        ]
    });
    return session;
};
