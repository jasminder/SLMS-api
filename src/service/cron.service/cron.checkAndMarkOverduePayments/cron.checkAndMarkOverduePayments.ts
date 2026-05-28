import { NotificationType } from '@prisma/client';
import { db } from '../../../utils/db.server';
import { createManyNotificationsAndPush, getStudentNamesMap } from '../../notification.service/notification.service';

export const checkAndMarkOverduePayments = async () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize current date to remove time
    const tempdate = currentDate;

    // Fetch templates that are due on or before today and have not been checked after the due date was last set or updated
    const templates = await db.feeTemplate.findMany({
        where: {
            dueDate: {
                lte: currentDate
            }
        },
        include: {
            feePayments: {
                include: {
                    studentTermFee: true
                }
            }
        }
    });

    const updates = templates
        .filter((template) => !template.lastCronJobRun || template.lastCronJobRun <= template.dueDate)
        .map(async (template) => {
            const overduePayments = template.feePayments.filter((payment) => payment.dueAmount > 0 && new Date(payment.dueDate).getTime() <= currentDate.getTime());

            if (overduePayments.length > 0) {
                return db.$transaction(async (prisma) => {
                    const paymentUpdates = overduePayments.map((payment) =>
                        prisma.feePayment.update({
                            where: { id: payment.id },
                            data: { status: 'OVERDUE', isActive: false, hasOverDue: true }
                        })
                    );
                    const templateUpdate = prisma.feeTemplate.update({
                        where: { id: template.id },
                        data: { lastCronJobRun: tempdate }
                    });
                    await Promise.all([...paymentUpdates, templateUpdate]);
                });
            }

            const validPayments1 = overduePayments.filter((payment) => payment.studentTermFee?.studentId != null);
            const cronNames1 = await getStudentNamesMap(validPayments1.map((p) => p.studentTermFee!.studentId));
            return createManyNotificationsAndPush(
                validPayments1.map((payment) => ({
                    studentId: payment.studentTermFee!.studentId,
                    type: NotificationType.FEE,
                    title: 'Overdue Fee Payment',
                    content: `${cronNames1.get(payment.studentTermFee!.studentId) ?? 'Student'}, your fee payment of ${payment.dueAmount} for ${template.invoiceName} is overdue.`,
                    actionUrl: `/student/fee-list?studentId=${payment.studentTermFee!.studentId}`
                }))
            );
        });

    return Promise.all(updates); // Filter out undefined results from templates without overdue payments
};
// Ensure this import is correct for your project structure

export const checkAndMarkOverduePayments1 = async () => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize current date to remove time
    const tempdate = currentDate;

    // Fetch templates that are due on or before today and have not been checked after the due date was last set or updated
    const templates = await db.feeTemplate.findMany({
        where: {
            dueDate: {
                lte: currentDate
            }
        },
        include: {
            feePayments: {
                include: {
                    studentTermFee: {
                        include: {
                            student: true
                        }
                    }
                }
            }
        }
    });

    const updates = templates
        .filter((template) => !template.lastCronJobRun || template.lastCronJobRun <= template.dueDate)
        .map(async (template) => {
            const overduePayments = template.feePayments.filter((payment) => payment.dueAmount > 0 && new Date(payment.dueDate).getTime() <= currentDate.getTime());

            if (overduePayments.length > 0) {
                return db.$transaction(async (prisma) => {
                    const paymentUpdates = overduePayments.map((payment) =>
                        prisma.feePayment.update({
                            where: { id: payment.id },
                            data: { status: 'OVERDUE', isActive: false, hasOverDue: true }
                        })
                    );
                    const templateUpdate = prisma.feeTemplate.update({
                        where: { id: template.id },
                        data: { lastCronJobRun: tempdate }
                    });
                    await Promise.all([...paymentUpdates, templateUpdate]);
                });
            }

            const cronNames2 = await getStudentNamesMap(overduePayments.map((p) => p.studentTermFee!.studentId));
            return createManyNotificationsAndPush(
                overduePayments.map((payment) => ({
                    studentId: payment.studentTermFee!.studentId,
                    type: NotificationType.FEE,
                    title: 'Overdue Fee Payment',
                    content: `${cronNames2.get(payment.studentTermFee!.studentId) ?? 'Student'}, your fee payment of ${payment.dueAmount} for ${template.invoiceName} is overdue.`,
                    actionUrl: `/student/fee-list?studentId=${payment.studentTermFee?.studentId}`,
                    expiresAt: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                }))
            );
        });

    return Promise.all(updates);
};
