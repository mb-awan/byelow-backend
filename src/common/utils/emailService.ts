import nodemailer, { Transporter } from 'nodemailer';

import { logger } from '@/server';

import { env } from './envConfig';

// Create a transport instance for Brevo SMTP
const transport: Transporter = nodemailer.createTransport({
  host: env.SMTP_SERVER,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // Use SSL for port 465, otherwise TLS for port 587
  auth: {
    user: env.SMTP_LOGIN,
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
  const from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL_NO_REPLY}>`;
  const msg = { from, to, subject, html };
  try {
    await transport.sendMail(msg);
    logger.info('Email sent successfully');
  } catch (error: any) {
    logger.error(`Error sending email: ${error?.message ?? 'Unknown error'}`);
  }
};

/**
 * Modern, elegant email template with dark/light mode support
 * Fully responsive and optimized for all email clients
 */
const getEmailTemplate = (content: string): string => {
  const logoUrl = `${env.FRONTEND_URL}/assets/images/logo.png`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>Byelow</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* ============================================
       RESET & BASE STYLES
       ============================================ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a0a0a;
      color: #ffffff;
    }
    
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
      display: block;
    }
    
    a {
      text-decoration: none;
      color: inherit;
    }
    
    /* ============================================
       DARK MODE (DEFAULT)
       ============================================ */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #0a0a0a !important;
      }
      .email-card {
        background-color: #111111 !important;
        border-color: #1f1f1f !important;
      }
      .email-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%) !important;
      }
      .text-primary {
        color: #ffffff !important;
      }
      .text-secondary {
        color: #cbd5e1 !important;
      }
      .text-muted {
        color: #94a3b8 !important;
      }
      .border-divider {
        border-color: #1e293b !important;
      }
      .footer-bg {
        background-color: #0f172a !important;
      }
    }
    
    /* ============================================
       LIGHT MODE SUPPORT
       ============================================ */
    @media (prefers-color-scheme: light) {
      .email-container {
        background-color: #f8fafc !important;
      }
      .email-card {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .email-header {
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%) !important;
      }
      .text-primary {
        color: #0f172a !important;
      }
      .text-secondary {
        color: #475569 !important;
      }
      .text-muted {
        color: #64748b !important;
      }
      .border-divider {
        border-color: #e2e8f0 !important;
      }
      .footer-bg {
        background-color: #f8fafc !important;
      }
    }
    
    /* ============================================
       RESPONSIVE DESIGN
       ============================================ */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
        padding: 16px !important;
      }
      .email-card {
        border-radius: 20px !important;
      }
      .header-section {
        padding: 40px 24px 32px !important;
      }
      .content-section {
        padding: 32px 24px !important;
      }
      .footer-section {
        padding: 28px 24px !important;
      }
      .logo-img {
        height: 56px !important;
        width: 56px !important;
      }
      .brand-title {
        font-size: 28px !important;
      }
      .brand-subtitle {
        font-size: 13px !important;
      }
      .heading-main {
        font-size: 22px !important;
        line-height: 1.3 !important;
      }
      .text-content {
        font-size: 15px !important;
        line-height: 1.6 !important;
      }
      .otp-display {
        font-size: 36px !important;
        letter-spacing: 8px !important;
      }
      .otp-label {
        font-size: 12px !important;
      }
      .cta-button {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
    }
    
    /* ============================================
       UTILITY CLASSES
       ============================================ */
    .gradient-blue {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%) !important;
    }
    
    .gradient-red {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%) !important;
    }
    
    .shadow-sm {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }
    
    .shadow-md {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    }
    
    .shadow-lg {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #0a0a0a;">
  <!-- Email Container -->
  <table role="presentation" class="email-container" style="width: 100%; border-collapse: collapse; background-color: #0a0a0a; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Email Wrapper -->
        <table role="presentation" class="email-wrapper" style="max-width: 600px; width: 100%; border-collapse: collapse; margin: 0 auto; padding: 48px 24px;">
          <tr>
            <td>
              <!-- Email Card -->
              <table role="presentation" class="email-card" style="width: 100%; border-collapse: collapse; background-color: #111111; border-radius: 24px; overflow: hidden; border: 1px solid #1f1f1f; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);">
                
                <!-- Header Section with Logo -->
                <tr>
                  <td class="email-header header-section" style="padding: 48px 40px 40px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <!-- Logo Container -->
                          <table role="presentation" style="border-collapse: collapse; margin: 0 auto;">
                            <tr>
                              <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; padding: 8px; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);">
                                <img src="${logoUrl}" alt="Byelow Logo" class="logo-img" style="height: 64px; width: 64px; display: block; border-radius: 12px; background-color: #ffffff;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 4px;">
                          <h1 class="brand-title" style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1.2;">
                            Byelow
                          </h1>
                          <p class="brand-subtitle" style="margin: 10px 0 0; color: #94a3b8; font-size: 14px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
                            Complete SEO Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Main Content Section -->
                <tr>
                  <td class="content-section" style="padding: 48px 40px;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer Section -->
                <tr>
                  <td class="footer-bg footer-section border-divider" style="padding: 36px 40px; border-top: 1px solid #1e293b; text-align: center; background-color: #0f172a;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 15px; font-weight: 600; line-height: 1.5;">
                      Thanks for choosing Byelow!
                    </p>
                    <p style="margin: 0 0 14px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                      The Byelow Team
                    </p>
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                      © ${new Date().getFullYear()} Byelow. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Send verification email with OTP
 * @param to - The recipient's email address
 * @param otp - The OTP code
 * @param name - The recipient's name
 * @returns Promise<void>
 */
const sendVerificationEmailOTP = async (to: string, otp: string, name: string): Promise<void> => {
  const subject = 'Verify Your Byelow Account';

  const content = `
    <!-- Greeting Section -->
    <h2 class="heading-main text-primary" style="margin: 0 0 20px; color: #ffffff; font-size: 26px; font-weight: 700; line-height: 1.3; letter-spacing: -0.5px;">
      Hi ${name || 'there'} 👋
    </h2>
    
    <!-- Welcome Message -->
    <p class="text-content text-secondary" style="margin: 0 0 28px; color: #cbd5e1; font-size: 16px; line-height: 1.75;">
      Welcome to <strong style="color: #ffffff; font-weight: 700;">Byelow</strong>! We're thrilled to have you join our platform. 
      To get started, please verify your email address using the code below.
    </p>
    
    <!-- OTP Container -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 36px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" class="gradient-blue shadow-lg" style="border-collapse: collapse; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);">
            <tr>
              <td style="padding: 32px 28px; text-align: center;">
                <!-- OTP Label -->
                <p class="otp-label" style="margin: 0 0 20px; color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.95;">
                  Your Verification Code
                </p>
                <!-- OTP Code Display -->
                <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 auto;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <div style="background-color: #ffffff; padding: 28px 36px; border-radius: 12px; display: inline-block; min-width: 260px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                        <span class="otp-display" style="font-size: 42px; font-weight: 800; color: #1d4ed8; letter-spacing: 12px; font-family: 'SF Mono', 'Monaco', 'Courier New', monospace; display: inline-block; line-height: 1.2;">
                          ${otp}
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Instructions -->
    <p class="text-content text-secondary" style="margin: 28px 0 0; color: #94a3b8; font-size: 15px; line-height: 1.75;">
      Enter this code in the app to complete your verification. 
      <strong style="color: #ffffff; font-weight: 600;">This code expires in 2 minutes.</strong>
    </p>
    
    <p class="text-content text-muted" style="margin: 18px 0 0; color: #64748b; font-size: 14px; line-height: 1.7;">
      If you didn't request this code, you can safely ignore this email.
    </p>
    
    <!-- CTA Button -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 36px 0 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${env.FRONTEND_URL}" 
             class="cta-button gradient-blue" 
             style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; line-height: 1.5; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); letter-spacing: 0.3px;">
            Visit Byelow →
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = getEmailTemplate(content);
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
  const subject = 'Reset Your Byelow Password';

  const content = `
    <!-- Greeting Section -->
    <h2 class="heading-main text-primary" style="margin: 0 0 20px; color: #ffffff; font-size: 26px; font-weight: 700; line-height: 1.3; letter-spacing: -0.5px;">
      Hi ${name || 'there'} 🔐
    </h2>
    
    <!-- Message -->
    <p class="text-content text-secondary" style="margin: 0 0 28px; color: #cbd5e1; font-size: 16px; line-height: 1.75;">
      We received a request to reset your password for your <strong style="color: #ffffff; font-weight: 700;">Byelow</strong> account. 
      Use the code below to reset your password securely.
    </p>
    
    <!-- OTP Container -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 36px 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <table role="presentation" class="gradient-red shadow-lg" style="border-collapse: collapse; background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);">
            <tr>
              <td style="padding: 32px 28px; text-align: center;">
                <!-- OTP Label -->
                <p class="otp-label" style="margin: 0 0 20px; color: #ffffff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.95;">
                  Your Password Reset Code
                </p>
                <!-- OTP Code Display -->
                <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 auto;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <div style="background-color: #ffffff; padding: 28px 36px; border-radius: 12px; display: inline-block; min-width: 260px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                        <span class="otp-display" style="font-size: 42px; font-weight: 800; color: #b91c1c; letter-spacing: 12px; font-family: 'SF Mono', 'Monaco', 'Courier New', monospace; display: inline-block; line-height: 1.2;">
                          ${otp}
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Instructions -->
    <p class="text-content text-secondary" style="margin: 28px 0 0; color: #94a3b8; font-size: 15px; line-height: 1.75;">
      Enter this code in the app to reset your password. 
      <strong style="color: #ffffff; font-weight: 600;">This code expires in 2 minutes.</strong>
    </p>
    
    <p class="text-content text-muted" style="margin: 18px 0 0; color: #64748b; font-size: 14px; line-height: 1.7;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    
    <!-- CTA Button -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 36px 0 0;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${env.FRONTEND_URL}" 
             class="cta-button gradient-blue" 
             style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; line-height: 1.5; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); letter-spacing: 0.3px;">
            Visit Byelow →
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = getEmailTemplate(content);
  await sendEmail(to, subject, html);
};

export { sendEmail, sendForgotPasswordOTP, sendVerificationEmailOTP, transport };
