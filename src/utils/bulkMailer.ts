import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * One pooled connection to the school's mail relay for sending many emails (Scope of Work item 35). Messages go out gently
 * (a few at a time) from EMAIL_FROM, as plain text. Never throws: every send answers { ok, error }.
 */
export type MailSender = {
    send: (message: { to: string; subject: string; text: string }) => Promise<{ ok: boolean; error?: string }>;
    close: () => void;
};

export function createBulkMailer(): MailSender {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT!),
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD }
    });
    return {
        send: async ({ to, subject, text }) => {
            try {
                const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
                if (info?.rejected?.length) return { ok: false, error: 'The mail server rejected this address.' };
                return { ok: true };
            } catch (error) {
                return { ok: false, error: (error instanceof Error ? error.message : 'Send failed').slice(0, 300) };
            }
        },
        close: () => transporter.close()
    };
}
