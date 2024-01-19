import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

type OptionType = {
    email: string;
    subject: string;
    text: string;
};

export const sendEmail = async (option: OptionType): Promise<boolean> => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '0'),
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const emailOptions = {
            from: 'nithin.mohanan@gmail.com',
            to: option.email,
            subject: option.subject,
            text: option.text
        };

        await transporter.sendMail(emailOptions);
        return true; // Email sent successfully
    } catch (error) {
        console.error('Email send error:', error);
        return false; // Email send failed
    }
};
