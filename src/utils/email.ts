import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
type optionType = {
    email: string;
    subject: string;
    text: string;
};
export const sendEmail = async (option: optionType) => {
    // create a transporter using mailtrap credentials
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

    await transporter.sendMail(emailOptions);
};
