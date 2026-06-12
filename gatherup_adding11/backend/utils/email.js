import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

/**
 * Sends email if SMTP is configured; otherwise logs to console (dev-friendly).
 */
export async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'GatherUp noreply@gatherup.local';
  const tx = getTransporter();
  if (!tx) {
    console.log('[email:skipped — SMTP not configured]', { to, subject, text: text?.slice?.(0, 200) });
    return { skipped: true };
  }
  try {
    await tx.sendMail({ from, to, subject, text, html: html || text });
    return { sent: true };
  } catch (err) {
    console.error('[email:error]', err.message);
    return { error: err.message };
  }
}
