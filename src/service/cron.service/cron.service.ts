import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import { sendEmail } from '../../utils/email';

// Schedule to run every Sunday at 4:30 PM

export async function sendAutomatedEmails() {
    // Fetch feedback entries where isSent is false
    const feedbackEntries = await db.feedback.findMany({
        where: {
            isSent: false
        },
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }
        }
    });

    for (const feedback of feedbackEntries) {
        // Prepare and send an email for each feedback entry
        if (feedback.student.personalDetails?.email) {
            const emailOptions = {
                email: feedback.student.personalDetails?.email, // Replace with actual recipient email
                subject: 'Feedback Update',
                text: feedback.content
            };
            try {
                await sendEmail(emailOptions);
                // Mark feedback as sent
                await db.feedback.update({
                    where: { id: feedback.id },
                    data: { isSent: true }
                });
                await db.interaction.create({
                    data: {
                        studentId: feedback.studentId,
                        interactionType: 'AUTOMATED_EMAIL', // Assuming this is the correct type for this scenario
                        description: `Feedback email sent: ${feedback.title}`,
                        contactedDate: new Date(), // Current date and time of interaction
                        createdBy: feedback.teacherId // Assuming the teacher who provided feedback is the one creating the interaction record
                    }
                });
            } catch (error) {
                // console.error('Error sending feedback email:', error);
            }
        }
    }
}

export async function processMonthlyFees() {
    // console.log('Start processing monthly fees');

    try {
        // Fetch active students enrolled in terms with monthly payment
        const monthlyEnrollments = await db.enrollment.findMany({
            where: {
                student: {
                    isActive: true
                },
                termSubjectGroup: {
                    fee: {
                        paymentType: 'MONTHLY'
                    }
                }
            },
            include: {
                student: true,
                termSubjectGroup: {
                    include: {
                        fee: true,
                        term: true
                    }
                }
            }
        });

        // Process each enrollment
        for (const enrollment of monthlyEnrollments) {
            const feeAmount = enrollment.termSubjectGroup?.fee?.amount ?? 0;
            const studentId = enrollment.studentId;
            const termSubjectGroupId = enrollment.termSubjectGroupId;
            const termId = enrollment.termSubjectGroup.termId;

            // Fetch or create StudentTermFee record
            const studentTermFee = await db.studentTermFee.upsert({
                where: {
                    studentId_termSubjectGroupId_termId: {
                        studentId,
                        termSubjectGroupId,
                        termId
                    }
                },
                update: {},
                create: {
                    studentId,
                    termSubjectGroupId,
                    termId
                }
            });

            // Check if a fee payment for the current month already exists
            const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const existingFeePayment = await db.feePayment.findFirst({
                where: {
                    studentTermFeeId: studentTermFee.id,
                    feeId: enrollment.termSubjectGroup.feeId ?? 0,
                    dueDate: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd
                    }
                }
            });

            if (!existingFeePayment) {
                // Logic for credit amount and due amount calculations
                let creditAmount = 0; // Logic to determine credit amount
                let dueAmount = feeAmount - creditAmount;

                // Create a new fee payment record for the current month
                const newFeePayment = await db.feePayment.create({
                    data: {
                        studentTermFeeId: studentTermFee.id,
                        feeId: enrollment.termSubjectGroup.feeId as number,
                        dueDate: new Date(), // Your logic to set the due date
                        amountPaid: 0,
                        dueAmount,
                        status: 'PENDING',
                        method: 'NA',
                        feeAmount,
                        creditAmount
                    }
                });
            } else {
                console.log('Fee payment for the current month already exists. No new record created.');
            }
        }
    } catch (error) {
        console.error('Error processing monthly fees:', error);
    }

    console.log('Finished processing monthly fees');
}

export async function processTermFees() {
    console.log('Start processing term fees');

    try {
        const termEnrollments = await db.enrollment.findMany({
            where: {
                student: {
                    isActive: true
                },
                termSubjectGroup: {
                    fee: {
                        paymentType: 'TERM'
                    }
                }
            },
            include: {
                student: true,
                termSubjectGroup: {
                    include: {
                        fee: true,
                        term: true
                    }
                }
            }
        });

        for (const enrollment of termEnrollments) {
            const feeAmount = enrollment.termSubjectGroup?.fee?.amount ?? 0;
            const studentId = enrollment.studentId;
            const termSubjectGroupId = enrollment.termSubjectGroupId;
            const termId = enrollment.termSubjectGroup.termId;

            const studentTermFee = await db.studentTermFee.upsert({
                where: {
                    studentId_termSubjectGroupId_termId: {
                        studentId,
                        termSubjectGroupId,
                        termId
                    }
                },
                update: {},
                create: {
                    studentId,
                    termSubjectGroupId,
                    termId
                }
            });

            // Determine the start of the previous month
            const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
            const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            const existingFeePayment = await db.feePayment.findFirst({
                where: {
                    studentTermFeeId: studentTermFee.id,
                    feeId: enrollment.termSubjectGroup.feeId ?? 0,
                    dueDate: {
                        gte: previousMonthStart,
                        lte: currentMonthEnd
                    }
                }
            });

            if (!existingFeePayment) {
                let dueDate = new Date(); // Calculate the due date for the current term

                const newFeePayment = await db.feePayment.create({
                    data: {
                        studentTermFeeId: studentTermFee.id,
                        feeId: enrollment.termSubjectGroup.feeId as number,
                        dueDate,
                        amountPaid: 0,
                        dueAmount: feeAmount,
                        status: 'PENDING',
                        method: 'NA',
                        feeAmount,
                        creditAmount: 0
                    }
                });

                console.log('New term fee payment record created:', newFeePayment);
            } else {
                console.log('Term fee payment for the previous month already exists. No new record created.');
            }
        }
    } catch (error) {
        console.error('Error processing term fees:', error);
    }

    console.log('Finished processing term fees');
}

// Run the processTermFees function to test
