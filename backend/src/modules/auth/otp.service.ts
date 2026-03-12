import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import * as crypto from 'crypto';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  private resend: Resend;
  private smtpTransporter: Transporter;
  private emailService: 'smtp' | 'resend' | 'none' = 'none';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize SMTP (priority over Resend)
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      const smtpPort = this.config.get<number>('SMTP_PORT', 587);
      const smtpSecure = this.config.get<boolean>('SMTP_SECURE', false);
      const isDevelopment = this.config.get('NODE_ENV') === 'development';

      // Fix for Windows SSL certificate issues
      if (isDevelopment && process.platform === 'win32') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        this.logger.warn('SSL certificate verification disabled for SMTP on Windows');
      }

      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          // For Gmail and development on Windows
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        logger: isDevelopment,
        debug: isDevelopment,
      });
      this.emailService = 'smtp';
      this.logger.log(`SMTP email service initialized (${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
    } else {
      // Fallback to Resend
      const resendApiKey = this.config.get<string>('RESEND_API_KEY');
      if (resendApiKey) {
        // Fix for Windows SSL certificate verification issue
        // Only disable SSL verification in development on Windows
        const isDevelopment = this.config.get('NODE_ENV') === 'development';
        if (isDevelopment && process.platform === 'win32') {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          this.logger.warn('SSL certificate verification disabled for development on Windows');
        }

        this.resend = new Resend(resendApiKey);
        this.emailService = 'resend';
        this.logger.log('Resend email service initialized');
      } else {
        this.logger.warn('No email service configured - OTPs will be logged to console');
      }
    }
  }

  async sendOtp(email: string): Promise<void> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otpStore.set(`email:${email}`, { otp, expiresAt });

    // Log OTP in development mode only (for testing)
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.debug(`OTP for email ${email}: ${otp}`);
    }

    await this.sendEmailOtp(email, otp);
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const key = `email:${email}`;
    const stored = this.otpStore.get(key);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(key);
      throw new BadRequestException('OTP has expired');
    }

    if (stored.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Remove OTP after successful verification
    this.otpStore.delete(key);
    return true;
  }

  private async sendEmailOtp(email: string, otp: string): Promise<void> {
    const isDevelopment = this.config.get('NODE_ENV') === 'development';

    // If no email service configured, log OTP in development
    if (this.emailService === 'none') {
      this.logger.warn(`No email service configured. OTP for ${email}: ${otp}`);
      if (!isDevelopment) {
        throw new BadRequestException('Email service not configured');
      }
      return;
    }

    const emailHtml = this.getEmailTemplate(otp);

    try {
      if (this.emailService === 'smtp') {
        await this.sendViaSmtp(email, otp, emailHtml);
      } else {
        await this.sendViaResend(email, otp, emailHtml);
      }
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);

      // In development, don't fail - just log the OTP
      if (isDevelopment) {
        this.logger.warn(`Email service error in development. Use this OTP for testing: ${otp}`);
        return;
      }

      throw new BadRequestException(`Failed to send verification email: ${error.message}`);
    }
  }

  private async sendViaSmtp(email: string, otp: string, html: string): Promise<void> {
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL', 'noreply@paarcelmate.com');
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'PaarcelMate');

    const info = await this.smtpTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Your PaarcelMate Verification Code',
      html: html,
    });

    this.logger.log(`SMTP email sent to ${email}. Message ID: ${info.messageId}`);
  }

  private async sendViaResend(email: string, otp: string, html: string): Promise<void> {
    const isDevelopment = this.config.get('NODE_ENV') === 'development';

    const { data, error } = await this.resend.emails.send({
      from: 'PaarcelMate <onboarding@resend.dev>',
      to: [email],
      subject: 'Your PaarcelMate Verification Code',
      html: html,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${email}`, JSON.stringify(error, null, 2));

      // In development, don't fail - just log the OTP
      if (isDevelopment) {
        this.logger.warn(`Email delivery failed in development. Use this OTP for testing: ${otp}`);
        this.logger.warn(`To send emails to any address, verify a domain at resend.com/domains`);
        return;
      }

      throw new BadRequestException(`Failed to send verification email: ${error.message || JSON.stringify(error)}`);
    }

    this.logger.log(`Resend email sent to ${email}. Message ID: ${data?.id}`);
  }

  private getEmailTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">PaarcelMate</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Peer-to-Peer Delivery Platform</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                        Thank you for signing up with PaarcelMate! Use the verification code below to complete your registration:
                      </p>

                      <!-- OTP Code -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="background-color: #f8f9fa; border-radius: 8px; padding: 30px;">
                            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666666; font-size: 14px; line-height: 21px; margin: 30px 0 0 0;">
                        This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #999999; font-size: 12px; margin: 0; line-height: 18px;">
                        © ${new Date().getFullYear()} PaarcelMate. All rights reserved.<br>
                        This is an automated email, please do not reply.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

}
