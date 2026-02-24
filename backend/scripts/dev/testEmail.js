require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- Email Configuration Test ---');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`From: ${process.env.SMTP_FROM}`);
    console.log('-------------------------------\n');

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.error('Error: SMTP_HOST or SMTP_USER is missing in .env');
        process.exit(1);
    }

    const port = parseInt(process.env.SMTP_PORT || '587');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('Connection: SUCCESSFUL\n');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Felicity Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self
            subject: 'Felicity - SMTP Test Email',
            text: 'If you are reading this, your SMTP configuration is working correctly!',
            html: '<b>Success!</b> Your SMTP configuration is working correctly.',
        });

        console.log(`Email Sent: ${info.messageId}`);
        console.log('Test COMPLETE. Check your inbox (or spam folder).');
    } catch (error) {
        console.error('Test FAILED:', error.message);
    }
}

testEmail();
