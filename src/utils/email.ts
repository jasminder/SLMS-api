import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
type optionType = {
    email: string;
    subject: string;
    text: string;
};
/**
 * Sends an email through the configured SMTP relay.
 * Never throws (callers rely on that). Returns true only when the relay accepted the message
 * for every recipient, false on any error or rejected recipient.
 */
export const sendEmail = async (option: optionType): Promise<boolean> => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT!), //--> had error because process.env.EMAIL_PORT was returning a string by default instead of a number
            // secure: false, // upgrade later with STARTTLS
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        // create email option

        const emailOptions = {
            from: process.env.EMAIL_FROM,
            to: option.email,
            subject: option.subject,
            text: option.text
        };

        const info = await transporter.sendMail(emailOptions);
        if (info?.rejected?.length) {
            console.log(`Email "${option.subject}" rejected by the mail server (messageId ${info.messageId}):`, info.rejected.length, 'recipient(s) rejected');
            return false;
        }
        console.log(`Email "${option.subject}" accepted by the mail server (messageId ${info?.messageId})`);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
    // create a transporter using mailtrap credentials
};
