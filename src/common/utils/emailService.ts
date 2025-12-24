import nodemailer, { Transporter } from 'nodemailer';

import { logger } from '@/server';

import { env } from './envConfig';

// Create a transport instance
const transport: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // Use SSL for port 465, otherwise TLS for port 587
  auth: {
    user: env.SMTP_USERNAME,
    pass: env.SMTP_PASSWORD,
  },
});

if (env.NODE_ENV !== 'development') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch((error: Error) =>
      logger.warn(`Unable to connect to email server. Ensure that the SMTP settings are correct: ${error.message}`)
    );
}

/**
 * Send an email
 * @param to - The recipient's email address
 * @param subject - The subject of the email
 * @param html - The HTML content of the email
 * @returns Promise<void>
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const msg = { from: env.EMAIL_FROM, to, subject, html };
  try {
    await transport.sendMail(msg);
    logger.info('Email sent successfully');
  } catch (error: any) {
    logger.error(`Error sending email: ${error?.message ?? 'Unknown error'}`);
  }
};

/**
 * Send verification email with OTP
 * @param to - The recipient's email address
 * @param otp - The OTP code
 * @param name - The recipient's name
 * @returns Promise<void>
 */
const sendVerificationEmailOTP = async (to: string, otp: string, name: string): Promise<void> => {
  const subject = '🚀 Verify Your UnifyPosts Account';
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333; line-height: 1.6; border: 1px solid #ddd; border-radius: 8px;">
    <div style="text-align: center; padding: 20px 0;">
      <img src="https://res.cloudinary.com/dtsuchxhf/image/upload/fl_preserve_transparency/v1737693242/logo_jsuion.jpg?_s=public-apps" alt="UnifyPosts Logo" style="width: 180px;" />
    </div>
    <h2 style="text-align: center; color: #ef4444; margin-bottom: 20px;">Hi ${name},</h2>
    <p style="color: #333; text-align: center;">Welcome to <strong>UnifyPosts</strong>! We’re excited to have you on board. Before you can start exploring, we need to verify your email address.</p>
    <div style="background: #ef4444; padding: 15px 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; color: #fff; margin: 20px 0;">
      Your UnifyPosts verification code is: <span style="font-size: 28px; display: block; margin-top: 10px;">${otp}</span>
    </div>
    <p style="color: #333; text-align: center;">Please enter this code in the app to complete your verification. Note that this code will expire in <strong>2 minutes</strong>.</p>
    <p style="color: #333; text-align: center;">If you didn’t request this code, you can safely ignore this email.</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://www.unifyposts.com" style="background-color: #ef4444; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Visit UnifyPosts</a>
    </div>
    <p style="color: #333; text-align: center; margin-top: 20px;">Thanks for choosing UnifyPosts!</p>
    <p style="text-align: center; color: #333; margin-top: 20px;">The <strong>UnifyPosts Team</strong></p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="text-align: center; color: #999; font-size: 12px;">
      © ${new Date().getFullYear()} UnifyPosts. All rights reserved.
    </p>
  </div>`;
  await sendEmail(to, subject, html);
};

/**
 * Send forgot password email with OTP
 * @param to - The recipient's email address
 * @param otp - The OTP code
 * @param name - The recipient's name
 * @returns Promise<void>
 */
const sendForgotPasswordOTP = async (to: string, otp: string, name: string): Promise<void> => {
  const subject = '🚀 Reset Your UnifyPosts Password';
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333; line-height: 1.6; border: 1px solid #ddd; border-radius: 8px;">
    <div style="text-align: center; padding: 20px 0;">
      <img src="https://res.cloudinary.com/dtsuchxhf/image/upload/fl_preserve_transparency/v1737693242/logo_jsuion.jpg?_s=public-apps" alt="UnifyPosts Logo" style="width: 180px;" />
    </div>
    <h2 style="text-align: center; color: #ef4444; margin-bottom: 20px;">Hi ${name},</h2>
    <p style="color: #333; text-align: center;">We received a request to reset your password for your UnifyPosts account.</p>
    <div style="background: #ef4444; padding: 15px 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px; color: #fff; margin: 20px 0;">
      Your UnifyPosts password reset code is: <span style="font-size: 28px; display: block; margin-top: 10px;">${otp}</span>
    </div>
    <p style="color: #333; text-align: center;">Please enter this code in the app to reset your password. Note that this code will expire in <strong>2 minutes</strong>.</p>
    <p style="color: #333; text-align: center;">If you didn’t request a password reset, you can safely ignore this email.</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://www.unifyposts.com" style="background-color: #ef4444; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Visit UnifyPosts</a>
    </div>
    <p style="color: #333; text-align: center; margin-top: 20px;">Thanks,</p>
    <p style="text-align: center; color: #333; margin-top: 20px;">The <strong>UnifyPosts Team</strong></p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="text-align: center; color: #999; font-size: 12px;">
      © ${new Date().getFullYear()} UnifyPosts. All rights reserved.
    </p>
  </div>`;
  await sendEmail(to, subject, html);
};

export { sendEmail, sendForgotPasswordOTP, sendVerificationEmailOTP, transport };
