// services/emailService.ts
import axios from 'axios';
import nodemailer from 'nodemailer';
import stream from 'stream';
import { promisify } from 'util';

export async function sendConsolidatedEmail1(recipient: string, subject: string, text: string, attachments: { filename: string; path: string }[]) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '0'),
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const emailAttachments = await Promise.all(
        attachments.map(async (attachment) => {
            // Download each file from S3 using the presigned URL
            const response = await axios.get(attachment.path, { responseType: 'stream' });
            const fileStream = response.data;

            // Stream to buffer conversion
            const finished = promisify(stream.finished);
            const chunks: Buffer[] = [];
            fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            await finished(fileStream);
            return {
                filename: attachment.filename,
                content: Buffer.concat(chunks)
            };
        })
    );

    // Email options
    const emailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipient,
        subject,
        text,
        attachments: emailAttachments
    };

    // Send email
    await transporter.sendMail(emailOptions);
}

export async function sendConsolidatedEmail(recipient: string, subject: string, text: string, attachments: { filename: string; path: string }[]) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '0'),
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const validAttachments = attachments.filter((attachment) => isValidHttpUrl(attachment.path));

    const emailAttachments = await Promise.all(
        validAttachments.map(async (attachment) => {
            // Download each file from S3 using the presigned URL
            const response = await axios.get(attachment.path, { responseType: 'stream' });
            const fileStream = response.data;

            // Stream to buffer conversion
            const finished = promisify(stream.finished);
            const chunks: Buffer[] = [];
            fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            await finished(fileStream);
            return {
                filename: attachment.filename,
                content: Buffer.concat(chunks)
            };
        })
    );

    // Email options
    const emailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipient,
        subject,
        text,
        attachments: emailAttachments
    };

    // Send email
    await transporter.sendMail(emailOptions);
}

function isValidHttpUrl(string: string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
}
