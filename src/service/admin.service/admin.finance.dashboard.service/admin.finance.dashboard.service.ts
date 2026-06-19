import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { db } from '../../../utils/db.server';

export async function getAllFeePayments(search = '', page: number, termId: number, paymentStatus = '', dueAmountSort = 'asc', invoiceId = '') {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
    // CREDIT is a student-level attribute, not a per-invoice status: filter by the
    // student's creditBalance and ignore the invoice scope so the set stays the
    // same regardless of the invoice dropdown.
    const isCredit = paymentStatus === 'CREDIT';
    const feePayments = await db.feePayment.findMany({
        where: {
            feeTemplate: {
                termId,
                id: !isCredit && invoiceId ? +invoiceId : undefined
            },
            ...(isCredit && {
                studentTermFee: {
                    student: {
                        creditBalance: { gt: 0 }
                    }
                }
            }),
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    feeTemplate: {
                        notes: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    feeTemplate: {
                        invoiceName: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    studentTermFee: {
                        student: {
                            personalDetails: {
                                OR: [
                                    {
                                        firstName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        lastName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            status: paymentStatus === 'PAID' ? PaymentStatus.PAID : paymentStatus === 'PENDING' ? PaymentStatus.PENDING : paymentStatus === 'OVERDUE' ? PaymentStatus.OVERDUE : undefined
        },
        skip,
        take,
        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
            {
                dueAmount: dueAmountSort == 'desc' ? 'desc' : 'asc'
            }
        ],
        include: {
            studentTermFee: {
                include: {
                    student: {
                        select: {
                            id: true,
                            akaalId: true,
                            creditBalance: true,
                            personalDetails: true
                        }
                    }
                }
            },
            feeTemplate: true
        }
    });
    const count = await db.feePayment.count({
        where: {
            feeTemplate: {
                termId,
                id: !isCredit && invoiceId ? +invoiceId : undefined
            },
            ...(isCredit && {
                studentTermFee: {
                    student: {
                        creditBalance: { gt: 0 }
                    }
                }
            }),
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    feeTemplate: {
                        notes: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    feeTemplate: {
                        invoiceName: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    studentTermFee: {
                        student: {
                            personalDetails: {
                                OR: [
                                    {
                                        firstName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        lastName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            status: paymentStatus === 'PAID' ? PaymentStatus.PAID : paymentStatus === 'PENDING' ? PaymentStatus.PENDING : paymentStatus === 'OVERDUE' ? PaymentStatus.OVERDUE : undefined
        }
    });

    return { feePayments, count };
}
export async function selectAllFeePayments(search = '', page: number, termId: number, paymentStatus = '', dueAmountSort = 'asc', invoiceName = '') {
    const feePayments = await db.feePayment.findMany({
        where: {
            feeTemplate: {
                termId,
                invoiceName: invoiceName ? invoiceName : undefined
            },
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    feeTemplate: {
                        notes: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    feeTemplate: {
                        invoiceName: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    studentTermFee: {
                        student: {
                            personalDetails: {
                                OR: [
                                    {
                                        firstName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        lastName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            status: paymentStatus === 'PAID' ? PaymentStatus.PAID : paymentStatus === 'PENDING' ? PaymentStatus.PENDING : paymentStatus === 'OVERDUE' ? PaymentStatus.OVERDUE : undefined
        },

        orderBy: [
            { createdAt: 'asc' },
            { id: 'asc' },
            {
                dueAmount: dueAmountSort == 'desc' ? 'desc' : 'asc'
            }
        ],
        select: {
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            id: true,
                            akaalId: true,
                            creditBalance: true,
                            personalDetails: {
                                select: {
                                    email: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    const count = await db.feePayment.count({
        where: {
            feeTemplate: {
                termId,
                invoiceName: invoiceName ? invoiceName : undefined
            },
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    feeTemplate: {
                        notes: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    feeTemplate: {
                        invoiceName: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    studentTermFee: {
                        student: {
                            personalDetails: {
                                OR: [
                                    {
                                        firstName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        lastName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            status: paymentStatus === 'PAID' ? PaymentStatus.PAID : paymentStatus === 'PENDING' ? PaymentStatus.PENDING : paymentStatus === 'OVERDUE' ? PaymentStatus.OVERDUE : undefined
        }
    });
    const totalDueAmount = await db.feePayment.aggregate({
        where: {
            feeTemplate: {
                termId,
                invoiceName: invoiceName ? invoiceName : undefined
            },
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    feeTemplate: {
                        notes: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    feeTemplate: {
                        invoiceName: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    studentTermFee: {
                        student: {
                            personalDetails: {
                                OR: [
                                    {
                                        firstName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        lastName: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    },
                                    {
                                        email: {
                                            contains: search,
                                            mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            status: paymentStatus === 'PAID' ? PaymentStatus.PAID : paymentStatus === 'PENDING' ? PaymentStatus.PENDING : paymentStatus === 'OVERDUE' ? PaymentStatus.OVERDUE : undefined
        },
        _sum: {
            dueAmount: true
        }
    });
    const totalPaidAmount = await db.paymentInstallment.aggregate({
        where: {
            feePayment: {
                AND: [
                    { status: PaymentStatus.PAID },
                    {
                        feeTemplate: {
                            termId,
                            invoiceName: invoiceName ? invoiceName : undefined
                        },
                        OR: [
                            {
                                invoiceId: {
                                    contains: search,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                feeTemplate: {
                                    notes: {
                                        contains: search,
                                        mode: 'insensitive'
                                    }
                                }
                            },
                            {
                                feeTemplate: {
                                    invoiceName: {
                                        contains: search,
                                        mode: 'insensitive'
                                    }
                                }
                            },
                            {
                                studentTermFee: {
                                    student: {
                                        personalDetails: {
                                            OR: [
                                                {
                                                    firstName: {
                                                        contains: search,
                                                        mode: 'insensitive'
                                                    }
                                                },
                                                {
                                                    lastName: {
                                                        contains: search,
                                                        mode: 'insensitive'
                                                    }
                                                },
                                                {
                                                    email: {
                                                        contains: search,
                                                        mode: 'insensitive'
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        },
        _sum: {
            paidAmount: true
        }
    });

    return { feePayments, count, totalDue: totalDueAmount._sum.dueAmount || 0, status: paymentStatus, totalPaid: totalPaidAmount._sum.paidAmount || 0 };
}

export async function getAllInvoiceNamesByTermId(termId: string) {
    return await db.feeTemplate.findMany({
        where: {
            term: {
                id: +termId
            }
        },
        select: {
            id: true,
            invoiceName: true
        }
    });
}

export async function getAllTerms() {
    return await db.term.findMany({
        select: {
            id: true,
            name: true,
            currentTerm: true
        }
    });
}

export async function feeDashboardQuery() {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });
    const aggregation = await db.feePayment.aggregate({
        _sum: {
            feeAmount: true,
            dueAmount: true,
            discountAmount: true
        },
        where: {
            feeTemplate: {
                termId: currentTerm?.id
            }
        }
    });
    const paidAmountCurrentTerm = await db.paymentInstallment.aggregate({
        _sum: {
            paidAmount: true
        },
        where: {
            feePayment: {
                feeTemplate: {
                    termId: currentTerm?.id
                }
            },
            NOT: {
                paymentMethod: PaymentMethod.DISCOUNT
            }
        }
    });

    const paidAmountPastTerms = await db.paymentInstallment.aggregate({
        _sum: {
            paidAmount: true
        },
        where: {
            feePayment: {
                feeTemplate: {
                    termId: {
                        not: currentTerm?.id
                    }
                }
            },
            NOT: {
                paymentMethod: PaymentMethod.DISCOUNT
            }
        }
    });
    // Calculate total overdue amount where hasOverDue is true
    const overdueAggregation = await db.feePayment.aggregate({
        _sum: {
            dueAmount: true // Only sum dueAmount where hasOverDue is true
        },
        where: {
            feeTemplate: {
                termId: currentTerm?.id
            },
            hasOverDue: true,
            status: 'OVERDUE'
        }
    });
    const overduePastTermsAggregation = await db.feePayment.aggregate({
        _sum: {
            dueAmount: true // Sum dueAmount where hasOverDue is true for all past terms
        },
        where: {
            feeTemplate: {
                termId: {
                    not: currentTerm?.id
                }
            },
            hasOverDue: true
        }
    });

    return {
        totalInvoiced: aggregation._sum.feeAmount || 0,
        totalDue: aggregation._sum.dueAmount || 0,
        totalDiscount: aggregation._sum.discountAmount || 0,
        totalOverdue: overdueAggregation._sum.dueAmount || 0,
        totalOverduePastTerms: overduePastTermsAggregation._sum.dueAmount || 0,
        totalPaidCurrentTerm: paidAmountCurrentTerm._sum.paidAmount || 0,
        totalPaidPastTerms: paidAmountPastTerms._sum.paidAmount || 0
    };
}


/**
 * Filtered-dashboard totals scoped to a term + optional invoice.
 *
 * Each metric uses its own hard-coded status filter so that the
 * status dropdown (which only filters table rows) never distorts
 * unrelated totals.
 *
 *   totalInvoiced  – feeAmount  for ALL records in scope  (no status filter)
 *   totalPaid      – paidAmount from installments on PAID records only
 *   totalDue       – dueAmount  for ALL records in scope  (PAID rows carry 0)
 *   totalOverdue   – dueAmount  for OVERDUE records only
 *   totalDiscount  – discountAmount for ALL records in scope
 *
 * NOTE: `paymentStatus` from the filter dropdown is intentionally NOT
 * accepted — it belongs only to the paginated table query.
 */
export async function filteredFeeDashboardQuery(termId: number, invoiceId?: number) {
    // Shared base scope — term + optional invoice, no status restriction
    const baseWhere = {
        feeTemplate: {
            termId,
            ...(invoiceId && { id: invoiceId })
        }
    };

    // 1. totalInvoiced / totalDue / totalDiscount — all records in scope
    const aggregation = await db.feePayment.aggregate({
        _sum: {
            feeAmount: true,
            dueAmount: true,
            discountAmount: true
        },
        where: baseWhere
    });

    // 2. totalPaid — sum of installment payments on PAID fee-payments only
    //    Exclude DISCOUNT-method entries so credits aren't double-counted.
    const paidAggregation = await db.paymentInstallment.aggregate({
        _sum: {
            paidAmount: true
        },
        where: {
            feePayment: {
                ...baseWhere,
                status: PaymentStatus.PAID
            },
            NOT: {
                paymentMethod: PaymentMethod.DISCOUNT
            }
        }
    });

    // 3. totalOverdue — dueAmount of genuinely overdue records only
    const overdueAggregation = await db.feePayment.aggregate({
        _sum: {
            dueAmount: true
        },
        where: {
            ...baseWhere,
            hasOverDue: true,
            status: PaymentStatus.OVERDUE
        }
    });

    return {
        totalInvoiced: aggregation._sum.feeAmount || 0,
        totalDue: aggregation._sum.dueAmount || 0,
        totalDiscount: aggregation._sum.discountAmount || 0,
        totalOverdue: overdueAggregation._sum.dueAmount || 0,
        totalPaid: paidAggregation._sum.paidAmount || 0
    };
}