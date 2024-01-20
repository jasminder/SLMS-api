// services/emailService.js
import axios from 'axios';
import nodemailer from 'nodemailer';
import stream from 'stream';
import { promisify } from 'util';

export async function sendEmailWithAttachment(recipients: string[], subject: string, text: string, attachmentUrl: string) {
    // Download file from S3 using the presigned URL
    const response = await axios.get(attachmentUrl, { responseType: 'stream' });
    const fileStream = response.data;

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '0'),
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Stream to buffer conversion
    const finished = promisify(stream.finished);
    const chunks: Buffer[] = [];
    fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    await finished(fileStream);
    const buffer = Buffer.concat(chunks);

    // Email options
    const emailOptions = {
        from: 'nithin.mohanan@gmail.com',
        to: recipients,
        subject,
        text,
        attachments: [
            {
                filename: attachmentUrl.split('/').pop(),
                content: buffer
            }
        ]
    };

    // Send email
    await transporter.sendMail(emailOptions);
}
