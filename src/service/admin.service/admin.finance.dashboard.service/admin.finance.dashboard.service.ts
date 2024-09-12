import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { db } from '../../../utils/db.server';

export async function getAllFeePayments(search = '', page: number, termId: number, paymentStatus = '', dueAmountSort = 'asc', invoiceId = '') {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
    const feePayments = await db.feePayment.findMany({
        where: {
            feeTemplate: {
                termId,
                id: invoiceId ? +invoiceId : undefined
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
                id: invoiceId ? +invoiceId : undefined
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


export async function filteredFeeDashboardQuery(termId: number, invoiceId?: number, paymentStatus?: PaymentStatus) {
    console.log(termId, invoiceId, paymentStatus, "hello");
    const whereClause = {
        feeTemplate: {
            termId: termId,
            ...(invoiceId && { id: invoiceId })
        },
        ...(paymentStatus && { status: paymentStatus })
    };

    const aggregation = await db.feePayment.aggregate({
        _sum: {
            feeAmount: true,
            dueAmount: true,
            discountAmount: true
        },
        where: whereClause
    });

    const paidAmount = await db.paymentInstallment.aggregate({
        _sum: {
            paidAmount: true
        },
        where: {
            feePayment: whereClause,
            NOT: {
                paymentMethod: PaymentMethod.DISCOUNT
            }
        }
    });

    const overdueAggregation = await db.feePayment.aggregate({
        _sum: {
            dueAmount: true
        },
        where: {
            ...whereClause,
            hasOverDue: true,
            status: PaymentStatus.OVERDUE
        }
    });

    return {
        totalInvoiced: aggregation._sum.feeAmount || 0,
        totalDue: aggregation._sum.dueAmount || 0,
        totalDiscount: aggregation._sum.discountAmount || 0,
        totalOverdue: overdueAggregation._sum.dueAmount || 0,
        totalPaid: paidAmount._sum.paidAmount || 0
    };
}