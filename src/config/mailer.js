import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailer = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: false, // STARTTLS en puerto 587
    auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
    },
});

export async function sendMail({ to, subject, text, html }) {
    return mailer.sendMail({
        from: env.smtp.from,
        to,
        subject,
        text,
        html,
    });
}

mailer.verify().then(()=>console.log('SMTP listo')).catch(err=>console.error('SMTP error:', err));