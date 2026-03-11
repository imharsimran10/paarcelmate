import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import * as crypto from 'crypto';
import { Resend } from 'resend';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  private resend: Resend;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize Resend
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
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not configured - emails will not be sent');
    }
  }

  async sendOtp(identifier: string, type: 'email' | 'phone'): Promise<void> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otpStore.set(`${type}:${identifier}`, { otp, expiresAt });

    // Log OTP in development mode only (for testing)
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.debug(`OTP for ${type} ${identifier}: ${otp}`);
    }

    if (type === 'email') {
      await this.sendEmailOtp(identifier, otp);
    } else {
      await this.sendSmsOtp(identifier, otp);
    }
  }

  async verifyOtp(identifier: string, type: 'email' | 'phone', otp: string): Promise<boolean> {
    const key = `${type}:${identifier}`;
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
    if (!this.resend) {
      this.logger.warn(`Email OTP not sent - Resend not configured. OTP: ${otp}`);
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'PaarcelMate <onboarding@resend.dev>', // Use your verified domain later
        to: [email],
        subject: 'Your PaarcelMate Verification Code',
        html: `
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
        `,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${email}`, error);
        throw new BadRequestException('Failed to send verification email');
      }

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  private async sendSmsOtp(phone: string, otp: string): Promise<void> {
    // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
    // For now, just log in development
    this.logger.warn(`SMS OTP not implemented. Would send to ${phone}: ${otp}`);

    // In production, throw error if SMS is required
    if (this.config.get('NODE_ENV') === 'production') {
      throw new BadRequestException('SMS verification not available. Please use email verification.');
    }
  }
}
