import crypto from 'crypto';
import { sendMail } from './email.js';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Calculate OTP expiration time (10 minutes from now)
 */
export function getOTPExpiration() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

/**
 * Send OTP email to user
 */
export async function sendOTPEmail(email, otp) {
  const subject = 'Your GatherUp Verification Code';
  const text = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Verify Your Email</h2>
      <p>Your verification code is:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  return await sendMail({ to: email, subject, text, html });
}

/**
 * Verify if OTP is valid and not expired
 */
export function verifyOTP(userOTP, providedOTP) {
  if (!userOTP || !providedOTP) return false;
  if (userOTP !== providedOTP) return false;
  return true;
}
