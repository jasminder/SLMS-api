import { db } from '../../../utils/db.server';

export async function getAllFeePayments(page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
    const feePayments = await db.feePayment.findMany({
        where: {
            feeTemplate: {
                termId
            }
        },
        skip,
        take,
        orderBy: {
            createdAt: 'asc'
        },
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
                termId
            }
        }
    });

    return { feePayments, count };
}

export async function searchAllFeePayments(search = '', page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;

    // const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    // if (searchAsNumber) {
    // } else if (!searchAsNumber) {
    // }
    const feePayments = await db.feePayment.findMany({
        where: {
            feeTemplate: {
                termId
            }
        },
        skip,
        take,
        orderBy: {
            createdAt: 'asc'
        },
        include: {
            studentTermFee: {
                include: {
                    student: {
                        select: {
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
                termId
            }
        }
    });

    return { feePayments, count };
}
