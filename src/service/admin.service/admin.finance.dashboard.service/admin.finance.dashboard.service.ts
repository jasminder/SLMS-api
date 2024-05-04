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
                            akaalId: true,
                            personalDetails: true
                        }
                    }
                }
            },
            feeTemplate: true
        }
    });
    return feePayments;
}
