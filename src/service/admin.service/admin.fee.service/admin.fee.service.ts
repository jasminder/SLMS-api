/*
1. Aggregated Payment Reports Based on FeeTemplate
To replicate the functionality of the SQL view I mentioned, you could use a Prisma query that aggregates data across related models. This will calculate totals for each FeeTemplate within a specific period, for example:

const getMonthlyPaymentReport = async () => {
  return await prisma.feePayment.groupBy({
    by: ['feeTemplateId'],
    _sum: {
      dueAmount: true,
      amountPaid: true,
    },
    _count: {
      feeTemplateId: true,
    },
    where: {
      feeTemplate: {
        month: 'January', // You can make this dynamic as needed
        year: '2024'
      }
    },
    include: {
      feeTemplate: {
        select: {
          invoiceName: true,
          month: true,
          year: true
        }
      }
    }
  });
}
*/
/*
2. Aggregate Total Due and Paid per Student or Term
You might also want to calculate the total amount due and paid for each student or for each term, which can be useful for understanding financial commitments or receivables:

const getTotalDueAndPaidPerStudent = async (studentId) => {
  return await prisma.feePayment.groupBy({
    by: ['studentTermFeeId'],
    _sum: {
      dueAmount: true,
      amountPaid: true,
    },
    where: {
      studentTermFee: {
        studentId: studentId
      }
    },
    include: {
      studentTermFee: {
        select: {
          student: {
            select: {
              personalDetails: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }
    }
  });
}
*/
/*Updating Aggregated Fields
To maintain aggregated fields (like total paid and due for each student or term), you'd use Prisma transactions to ensure that each payment update also updates an aggregate field. This requires writing logic within your application to handle these updates:

const updatePaymentAndAggregate = async (feePaymentId, amountPaid) => {
  const payment = await prisma.feePayment.update({
    where: { id: feePaymentId },
    data: {
      amountPaid: {
        increment: amountPaid
      }
    }
  });

  // Assuming an aggregated field exists on the Student model
  await prisma.student.update({
    where: { id: payment.studentTermFee.studentId },
    data: {
      totalPaid: {
        increment: amountPaid
      }
    }
  });

  return payment;
}

Computation of Dashboard Metrics
For dynamic computation (recommended for most real-time and up-to-date dashboards), you would calculate these values using Prisma queries. Here's an outline of how those queries might look:

1. Total Fees Invoiced till Date for a Term
const getTotalFeesInvoiced = async (termId) => {
  const totalInvoiced = await prisma.feePayment.aggregate({
    _sum: {
      feeAmount: true
    },
    where: {
      studentTermFee: {
        termId: termId,
        createdAt: {
          lte: new Date() // up to the current date
        }
      }
    }
  });
  return totalInvoiced._sum.feeAmount;
}
2. Total Fees Paid
const getTotalFeesPaid = async (termId) => {
  const totalPaid = await prisma.feePayment.aggregate({
    _sum: {
      amountPaid: true
    },
    where: {
      studentTermFee: {
        termId: termId
      }
    }
  });
  return totalPaid._sum.amountPaid;
}
3. Total Fees Due
const getTotalFeesDue = async (termId) => {
  const totalDue = await prisma.feePayment.aggregate({
    _sum: {
      dueAmount: true
    },
    where: {
      studentTermFee: {
        termId: termId
      }
    }
  });
  return totalDue._sum.dueAmount;
}
4. Total Fees Overdue
This would need to factor in the due date and compare it to the current date.
const getTotalFeesOverdue = async (termId) => {
  const totalOverdue = await prisma.feePayment.aggregate({
    _sum: {
      dueAmount: true
    },
    where: {
      studentTermFee: {
        termId: termId
      },
      dueDate: {
        lt: new Date() // overdue implies due date is less than today
      },
      status: {
        not: 'PAID' // assuming status 'PAID' means no amount is overdue
      }
    }
  });
  return totalOverdue._sum.dueAmount;
}
5. Total Fees Overdue from Previous Term
This assumes you have a reliable method to determine what constitutes a "previous term."
const getTotalFeesOverduePrevTerm = async (currentTermId) => {
  const previousTermId = currentTermId - 1; // Simplified calculation, adjust according to your term logic
  return await getTotalFeesOverdue(previousTermId);
}

*/
import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { PaymentType } from '@prisma/client';

export async function createFeeTemplateAndPayments(feeTemplateData: FeeTemplateDataSchema['body']) {
    const { studentIds, month, year, termId, termSubjectGroupId, dueDate, amount, termName, termSubjectGroupName, interval, notes } = feeTemplateData;

    // Execute all operations in a transaction
    return db.$transaction(async (prisma) => {
        // Create FeeTemplate inside the transaction
        const feeTemplate = await prisma.feeTemplate.create({
            data: {
                groupName: termSubjectGroupName,
                month,
                year,
                termName,
                termId: +termId,
                termSubjectGroupId: +termSubjectGroupId,
                amount: +amount,
                dueDate: new Date(dueDate),
                interval: interval === 'MONTHLY' ? PaymentType.MONTHLY : PaymentType.TERM,
                invoiceName: `${termSubjectGroupName}_${month}_${year}`,
                notes
            }
        });

        // Create FeePayment records for each student also inside the transaction
        const feePayments = await Promise.all(
            studentIds
                .map(async (studentId) => {
                    const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
                    if (!student) return null; // Continue if no student is found

                    const studentTermFee = await prisma.studentTermFee.findFirst({
                        where: { studentId: +studentId, termId: +termId, termSubjectGroupId: +termSubjectGroupId }
                    });

                    if (!studentTermFee) {
                        // Throw an error if the student is not enrolled in the specified term subject group
                        throw new Error(`Student with ID ${studentId} is not enrolled in the specified term subject group: ${termSubjectGroupName}`);
                    }

                    const monthNumber = (new Date(`${month} 1, ${year}`).getMonth() + 1).toString().padStart(2, '0');
                    const invoiceId = `${student.akaalId}_${monthNumber}`;

                    return prisma.feePayment.create({
                        data: {
                            invoiceId,
                            studentTermFeeId: studentTermFee.id,
                            feeTemplateId: feeTemplate.id,
                            dueDate: new Date(dueDate),
                            dueAmount: +amount,
                            paymentStatus: 'PENDING',
                            feeAmount: +amount,
                            adjustedFeeAmount: +amount
                        }
                    });
                })
                .filter((task) => task !== null)
        ); // Filter out null tasks

        return {
            message: 'FeeTemplate and FeePayments created successfully.',
            feeTemplate,
            feePayments
        };
    });
}
