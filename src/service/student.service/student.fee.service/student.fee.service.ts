import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { PaymentType } from '@prisma/client';

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