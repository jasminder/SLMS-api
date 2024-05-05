import { db } from '../../../utils/db.server';

export async function getAllFeePayments(search = '', page: number, termId: number, paymentStatus = '', dueAmountSort = 'asc', invoiceName = '') {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
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
                // {
                //     feeTemplate: {
                //         invoiceName: {
                //             contains: search,
                //             mode: 'insensitive'
                //         }
                //     }
                // },
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
            paymentStatus: paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'PENDING' ? 'PENDING' : paymentStatus === 'OVERDUE' ? 'OVERDUE' : undefined
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
                invoiceName: invoiceName ? invoiceName : undefined
            },
            OR: [
                {
                    invoiceId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                // {
                //     feeTemplate: {
                //         invoiceName: {
                //             contains: search,
                //             mode: 'insensitive'
                //         }
                //     }
                // }
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
            paymentStatus: paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'PENDING' ? 'PENDING' : paymentStatus === 'OVERDUE' ? 'OVERDUE' : undefined
        }
    });

    return { feePayments, count };
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
