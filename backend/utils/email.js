const nodemailer = require('nodemailer');

// Use a test/ethereal transport if SMTP not configured
const createTransport = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const port = parseInt(process.env.SMTP_PORT || '587');

  if (host && user) {
    const config = {
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    // Special handling for Gmail to be more robust on cloud platforms
    if (host.includes('gmail.com')) {
      config.service = 'gmail';
      // When using 'service', nodemailer ignores host/port, which often works better
      // but we keep them in config just in case.
    }

    return nodemailer.createTransport(config);
  }
  // Fallback: log to console
  return {
    sendMail: async (opts) => {
      console.log('\n========= EMAIL =========');
      console.log(`To: ${opts.to}`);
      console.log(`Subject: ${opts.subject}`);

      // Extract link if it's a password reset email
      if (opts.html && opts.html.includes('Reset Password')) {
        const linkMatch = opts.html.match(/href="([^"]+)"/);
        if (linkMatch) {
          console.log(`\n Click here to Reset Password:\n    -> ${linkMatch[1]}\n`);
        }
      } else {
        console.log(`\n(Body content omitted for brevity)`);
      }

      console.log('=========================\n');
      return { messageId: 'console-' + Date.now() };
    }
  };
};

const transporter = createTransport();

const sendTicketEmail = async ({ to, participantName, eventName, ticketId, qrCode, eventDate, organizer, isTicket = true }) => {
  const subject = isTicket
    ? ` Your Ticket for ${eventName} Felicity`
    : ` Your Purchase Confirmation ${eventName}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e0e0ff; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #a855f7); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: #fff;">Felicity</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Event Management Platform</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #a78bfa; margin-top: 0;">Hi ${participantName}!</h2>
        <p style="color: #c4b5fd;">You're all set for <strong style="color: #fff;">${eventName}</strong>.</p>
        <div style="background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 4px 0; color: #e0e0ff;"><strong>Ticket ID:</strong> <span style="font-family: monospace; color: #a78bfa;">${ticketId}</span></p>
          <p style="margin: 4px 0; color: #e0e0ff;"><strong>Date:</strong> ${eventDate}</p>
          <p style="margin: 4px 0; color: #e0e0ff;"><strong>Organizer:</strong> ${organizer}</p>
        </div>
        ${qrCode ? `
        <div style="text-align: center; margin: 24px 0;">
          <p style="color: #a78bfa; font-size: 13px; margin-bottom: 8px;">Present this QR code at the venue</p>
          <img src="${qrCode}" alt="QR Code" style="width: 180px; height: 180px; border: 4px solid #6c63ff; border-radius: 12px;" />
        </div>` : ''}
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 32px;">This is an automated email from Felicity. Do not reply.</p>
      </div>
    </div>
    `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Felicity <noreply@felicity.iiit.ac.in>',
    to,
    subject,
    html,
  });
};

const sendPasswordResetEmail = async ({ to, resetLink }) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e0e0ff; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #a855f7); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; color: #fff;">Felicity</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #a78bfa; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #c4b5fd;">You have requested to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: #6c63ff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 32px;">If you did not request this, please ignore this email.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Felicity <noreply@felicity.iiit.ac.in>',
    to,
    subject: 'Felicity - Password Reset',
    html,
  });
};

module.exports = { sendTicketEmail, sendPasswordResetEmail };
