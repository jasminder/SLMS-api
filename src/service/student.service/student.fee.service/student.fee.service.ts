import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { PaymentType } from '@prisma/client';
import { autoApplyCreditToFeePayment } from '../../../service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service';
import Stripe from 'stripe';

function resolveStripeSecretKey(): string | null {
    const candidates = [
        process.env.STRIPE_SECRET_KEY,
        process.env.STRIPE_SECRET_KEY_LIVE,
        process.env.STRIPE_SECRET_KEY_TEST
    ];

    for (const raw of candidates) {
        if (!raw) continue;
        const key = raw.trim().replace(/^['"]|['"]$/g, '');
        if (!key) continue;
        if (!key.startsWith('sk_')) continue;
        if (key.includes('*')) continue;
        return key;
    }
    return null;
}

export async function fetchFeePaymentsForCurrentTermByStudentId(studentId: string) {
    return db.feePayment.findMany({
        where: {
            studentTermFee: {
                studentId: +studentId
            },
            feeTemplate: {
                term: {
                    currentTerm: true
                }
            }
        },
        include: {
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            creditBalance: true
                        }
                    }
                }
            },
            feeTemplate: {
                select: {
                    invoiceName: true
                }
            }
        }
    });
}
export async function feePaymentByIdForStudentPortal(feePaymentId: string) {
    await autoApplyCreditToFeePayment(feePaymentId);
    const feePaymentById = await db.feePayment.findUnique({
        where: {
            id: +feePaymentId
        },
        include: {
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            creditBalance: true
                        }
                    }
                }
            },
            feeTemplate: {
                select: {
                    invoiceName: true
                }
            }
        }
    });
    return feePaymentById;
}
/*get all payment installments*/
export async function getPaymentsByFeePaymentIdStudentPortal(feePaymentId: string) {
    const payments = await db.paymentInstallment.findMany({
        where: {
            feePaymentId: parseInt(feePaymentId)
        },
        include: {
            feePayment: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return payments;
}

export async function createStudentPortalPaymentIntent(
    feePaymentId: string,
    currency = 'aud'
) {
    const feePayment = await db.feePayment.findUnique({
        where: { id: parseInt(feePaymentId) },
        include: {
            feeTemplate: {
                select: {
                    invoiceName: true
                }
            }
        }
    });

    if (!feePayment) {
        throw customError('Fee payment record not found', 'fail', 404, true);
    }

    const dueAmount = Number(feePayment.dueAmount ?? 0);
    if (dueAmount <= 0) {
        throw customError('No outstanding due amount for this fee payment', 'fail', 400, true);
    }

    const stripeSecretKey = resolveStripeSecretKey();
    if (!stripeSecretKey) {
        throw customError(
            'Stripe secret key is invalid/missing. Set STRIPE_SECRET_KEY to a real sk_test/sk_live key.',
            'fail',
            500,
            true
        );
    }

    const stripe = new Stripe(stripeSecretKey);
    const amountInMinorUnits = Math.round(dueAmount * 100);
    let paymentIntent: Stripe.PaymentIntent;
    try {
        paymentIntent = await stripe.paymentIntents.create({
            amount: amountInMinorUnits,
            currency: currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
            metadata: {
                feePaymentId: String(feePayment.id)
            },
            description: feePayment.feeTemplate?.invoiceName ?? `Fee payment #${feePayment.id}`
        });
    } catch (error: any) {
        if (error?.type === 'StripeAuthenticationError') {
            throw customError(
                'Stripe authentication failed. Please verify STRIPE_SECRET_KEY in backend env.',
                'fail',
                500,
                true
            );
        }
        throw error;
    }

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
    };
}