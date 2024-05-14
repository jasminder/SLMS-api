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
export async function feePaymentByIdForStudentPortalInvoice(feePaymentId: string) {
    const feePayment = await db.feePayment.findUnique({
        where: { id: parseInt(feePaymentId) },
        include: {
            feeTemplate: true, // Assuming you might want to include related data like feeTemplate
            studentTermFee: {
                include: {
                    student: {
                        include: {
                            personalDetails: true
                        }
                    },
                    term: true
                }
            },
            paymentInstallment: true // Include details about payment installments if needed
        }
    });
    const overDueFeePayments = await db.feePayment.findMany({
        where: {
            status: 'OVERDUE',
            id: {
                lte: +feePaymentId
            },
            studentTermFee: {
                student: {
                    id: feePayment?.studentTermFee?.student.id
                }
            }
        },
        include: {
            feeTemplate: true, // Assuming you might want to include related data like feeTemplate
            studentTermFee: {
                include: {
                    student: {
                        include: {
                            personalDetails: true
                        }
                    },
                    term: true
                }
            },
            paymentInstallment: true // Include details about payment installments if needed
        }
    });

    return { feePayment, overDueFeePayments };
}
