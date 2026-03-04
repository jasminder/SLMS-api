import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { PaymentType } from '@prisma/client';
import { autoApplyCreditToFeePayment } from '../../../service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service';

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