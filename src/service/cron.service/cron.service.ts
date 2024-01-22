import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import { sendEmail } from '../../utils/email';

// Schedule to run every Sunday at 4:30 PM

export async function sendFeedbackEmails() {
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
            } // Assuming you need student details for the email
            // Include other necessary relations if required
        }
    });
    console.log('Sending feedback');
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
            } catch (error) {
                console.error('Error sending feedback email:', error);
            }
        }
    }
}
