import Stripe from 'stripe';
import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { sendEmail } from '../../utils/email';

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
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
        customer_email: email,
        client_reference_id: invoiceId,
        payment_intent_data: {
            metadata: {
                // Include metadata here
                feePaymentId: String(feePaymentId), // Storing feePaymentId in metadata for later retrieval
                firstName: firstName,
                lastName: lastName,
                email: email
            }
        },

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
export const handlePaymentSuccess = async (paymentIntent: Stripe.PaymentIntent) => {

    const feePaymentId = paymentIntent.metadata.feePaymentId;
    const transactionId = paymentIntent.id; // Stripe's payment intent ID
    const paidAmount = paymentIntent.amount_received;
    const feePayment = await db.feePayment.findUnique({
        where: {
            id: +feePaymentId
        },
        include: {
            studentTermFee: {
                include: {
                    student: true
                }
            }
        }
    });
    if (!feePayment) {
        throw customError('Fee payment record not found', 'fail', 400, true);
    }
    const updateFeePayment = await db.feePayment.update({
        where: { id: parseInt(feePaymentId) },
        data: {
            dueAmount: 0, // Assuming the whole amount is settled
            hasOverDue: false,
            hasDue: false,
            status: 'PAID',
            updatedAt: new Date() // Update the timestamp
        }
    });
    const createPaymentInstallment = await db.paymentInstallment.create({
        data: {
            feePaymentId: parseInt(feePaymentId),
            paidAmount: paidAmount/100,
            paymentMethod: PaymentMethod.ONLINE,
            paymentStatus: PaymentStatus.PAID,
            transactionId: transactionId,
            paidDate: new Date(),
            createdAt: new Date(), // Set creation timestamp
            remarks: 'Stripe Payment processed successfully.',
            receivedBy: 'Online Payment - Stripe'
        }
    });
    const updateStudent = await db.student.update({
        where: { id: feePayment.studentTermFee?.student.id },
        data: {
            hasOverDue: false
        }
    });
};
export const handlePaymentFailure = async (failedIntent: Stripe.PaymentIntent) => {
    const feePaymentId = failedIntent.metadata.feePaymentId;
    const transactionId = failedIntent.id; // Stripe's payment intent ID
    const email = failedIntent.metadata.email;
    const text = failedIntent.last_payment_error?.message as string;
    const feePayment = await db.feePayment.findUnique({
        where: {
            id: +feePaymentId
        },
        include: {
            studentTermFee: {
                include: {
                    student: true
                }
            }
        }
    });
    if (!feePayment) {
        throw customError('Fee payment record not found', 'fail', 400, true);
    }
    const createPaymentInstallment = await db.paymentInstallment.create({
        data: {
            feePaymentId: parseInt(feePaymentId),
            paidAmount: 0,
            paymentMethod: PaymentMethod.ONLINE,
            paymentStatus: feePayment.status as PaymentStatus,
            remarks: failedIntent.last_payment_error?.message,
            receivedBy: 'NA',
            transactionId: transactionId,
            errorDetails: failedIntent.last_payment_error?.message,
            isTransactionSucess: false,
            paidDate: new Date(),
            createdAt: new Date() // Set creation timestamp
        }
    });
    const subject = 'Your online payment attempt failed';
    sendEmail({ email, subject, text });
};
