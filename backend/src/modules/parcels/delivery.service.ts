import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private resend: Resend;
  private smtpTransporter: Transporter;
  private emailService: 'smtp' | 'resend' | 'none' = 'none';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize email service (same as OtpService)
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      const smtpPort = this.config.get<number>('SMTP_PORT', 587);
      const smtpSecure = this.config.get<boolean>('SMTP_SECURE', false);
      const isDevelopment = this.config.get('NODE_ENV') === 'development';

      if (isDevelopment && process.platform === 'win32') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
      });
      this.emailService = 'smtp';
      this.logger.log(`SMTP email service initialized for delivery confirmations`);
    } else {
      const resendApiKey = this.config.get<string>('RESEND_API_KEY');
      if (resendApiKey) {
        const isDevelopment = this.config.get('NODE_ENV') === 'development';
        if (isDevelopment && process.platform === 'win32') {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }

        this.resend = new Resend(resendApiKey);
        this.emailService = 'resend';
        this.logger.log('Resend email service initialized for delivery confirmations');
      } else {
        this.logger.warn('No email service configured - Delivery OTPs will be logged to console');
      }
    }
  }

  // Generate random 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send delivery OTP email to recipient or sender (fallback)
  private async sendDeliveryOTPEmail(
    recipientEmail: string,
    recipientName: string,
    otp: string,
    parcelTitle: string,
    isSenderFallback: boolean = false
  ): Promise<void> {
    const isDevelopment = this.config.get('NODE_ENV') === 'development';

    if (this.emailService === 'none') {
      this.logger.warn(`No email service configured. Delivery OTP for ${recipientEmail}: ${otp}`);
      if (!isDevelopment) {
        throw new BadRequestException('Email service not configured');
      }
      return;
    }

    const emailHtml = this.getDeliveryOTPEmailTemplate(recipientName, otp, parcelTitle, isSenderFallback);

    try {
      if (this.emailService === 'smtp') {
        await this.sendViaSmtp(recipientEmail, emailHtml);
      } else {
        await this.sendViaResend(recipientEmail, emailHtml);
      }
    } catch (error) {
      this.logger.error(`Error sending delivery OTP email: ${error.message}`, error.stack);

      if (isDevelopment) {
        this.logger.warn(`Email service error in development. Delivery OTP: ${otp}`);
        return;
      }

      throw new Error(`Failed to send delivery OTP email: ${error.message}`);
    }
  }

  private async sendViaSmtp(email: string, html: string): Promise<void> {
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL', 'noreply@paarcelmate.com');
    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'PaarcelMate');

    const info = await this.smtpTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Delivery Confirmation - PaarcelMate',
      html: html,
    });

    this.logger.log(`Delivery OTP email sent via SMTP to ${email}. Message ID: ${info.messageId}`);
  }

  private async sendViaResend(email: string, html: string): Promise<void> {
    const isDevelopment = this.config.get('NODE_ENV') === 'development';

    const { data, error } = await this.resend.emails.send({
      from: 'PaarcelMate <onboarding@resend.dev>',
      to: [email],
      subject: 'Delivery Confirmation - PaarcelMate',
      html: html,
    });

    if (error) {
      this.logger.error(`Failed to send delivery OTP email to ${email}`, JSON.stringify(error, null, 2));

      if (isDevelopment) {
        this.logger.warn(`Email delivery failed in development.`);
        return;
      }

      throw new BadRequestException(`Failed to send delivery OTP email: ${error.message || JSON.stringify(error)}`);
    }

    this.logger.log(`Delivery OTP email sent via Resend to ${email}. Message ID: ${data?.id}`);
  }

  // Email template for delivery OTP
  private getDeliveryOTPEmailTemplate(
    recipientName: string,
    otp: string,
    parcelTitle: string,
    isSenderFallback: boolean = false
  ): string {
    const greeting = isSenderFallback
      ? `Hi ${recipientName} (Sender),`
      : `Hi ${recipientName},`;

    const introText = isSenderFallback
      ? `Your parcel <strong>"${parcelTitle}"</strong> is ready for delivery! The traveler has arrived at the recipient's location.<br><br><strong>Note:</strong> Since recipient email was not provided, we're sending this code to you as the sender. Please share this code with the recipient so they can provide it to the traveler.`
      : `Your parcel <strong>"${parcelTitle}"</strong> is ready for delivery! The traveler has arrived at your location.`;

    const instructionText = isSenderFallback
      ? 'Please share this 6-digit confirmation code with the recipient, who will then provide it to the traveler to complete the delivery:'
      : 'Please share this 6-digit confirmation code with the traveler to complete the delivery:';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Confirmation</title>
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
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Delivery Confirmation</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">${greeting}</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                        ${introText}
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                        ${instructionText}
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
                        This code will expire in <strong>10 minutes</strong>. Only share this code with the traveler when you receive your parcel.
                      </p>

                      <p style="color: #999999; font-size: 13px; line-height: 19px; margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e9ecef;">
                        <strong>Security Note:</strong> Never share this code via phone, email, or messaging apps. Only provide it in person to the traveler delivering your parcel.
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

  // Generate delivery OTP and send to recipient
  async generateDeliveryOTP(parcelId: string, travelerId: string) {
    // Verify parcel exists and traveler is authorized
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        trip: true,
        sender: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.trip || parcel.trip.userId !== travelerId) {
      throw new UnauthorizedException('You are not authorized to deliver this parcel');
    }

    if (parcel.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Parcel must be in transit to generate delivery OTP');
    }

    // Determine email recipient: recipient email or fallback to sender email
    let otpEmail: string;
    let otpRecipientName: string;
    let isSenderFallback = false;
    let otpSentTo: 'recipient' | 'sender';

    if (parcel.recipientEmail && parcel.recipientEmail.trim() !== '') {
      // Primary: Use recipient email
      otpEmail = parcel.recipientEmail;
      otpRecipientName = parcel.recipientName;
      otpSentTo = 'recipient';
      isSenderFallback = false;
    } else {
      // Fallback: Use sender email
      if (!parcel.sender.email) {
        throw new BadRequestException('Neither recipient nor sender email is available for OTP delivery');
      }
      otpEmail = parcel.sender.email;
      otpRecipientName = `${parcel.sender.firstName} ${parcel.sender.lastName}`;
      otpSentTo = 'sender';
      isSenderFallback = true;
      this.logger.warn(`Recipient email not available for parcel ${parcel.id}. Using sender email as fallback.`);
    }

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update parcel with OTP
    await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        deliveryOtp: otp,
        deliveryOtpExpiry: otpExpiry,
      },
    });

    // In development, log OTP to console
    const isDevelopment = this.config.get('NODE_ENV') === 'development';
    if (isDevelopment) {
      this.logger.debug('='.repeat(60));
      this.logger.debug(`📦 DELIVERY OTP FOR PARCEL: ${parcel.title}`);
      this.logger.debug(`📧 ${isSenderFallback ? 'Sender (Fallback)' : 'Recipient'}: ${otpRecipientName} (${otpEmail})`);
      this.logger.debug(`🔐 OTP CODE: ${otp}`);
      this.logger.debug(`⏰ Valid for: 10 minutes`);
      if (isSenderFallback) {
        this.logger.debug(`⚠️  Note: Recipient email not available, sent to sender`);
      }
      this.logger.debug('='.repeat(60));
    }

    // Send OTP via email
    try {
      await this.sendDeliveryOTPEmail(otpEmail, otpRecipientName, otp, parcel.title, isSenderFallback);
      this.logger.log(`Delivery OTP sent to ${otpEmail} (${otpSentTo}) for parcel ${parcel.id}`);
    } catch (error) {
      this.logger.error(`Failed to send delivery OTP email: ${error.message}`, error.stack);
      // In development, don't fail - OTP is already logged
      if (!isDevelopment) {
        throw new BadRequestException('Failed to send delivery OTP email');
      }
    }

    // Mask email for security (show first 2 chars and last part of domain)
    const emailParts = otpEmail.split('@');
    const maskedEmail = emailParts[0].slice(0, 2) + '***@' + emailParts[1];

    return {
      message: isSenderFallback
        ? 'Delivery OTP generated and sent to sender email (recipient email not available)'
        : 'Delivery OTP generated and sent to recipient email',
      sentTo: otpSentTo,
      email: maskedEmail,
      recipientName: parcel.recipientName,
      expiresAt: otpExpiry,
      note: isSenderFallback
        ? 'Recipient email was not provided. OTP sent to sender. Please share this code with the recipient.'
        : undefined,
    };
  }

  // Verify OTP and mark parcel as delivered
  async verifyDeliveryOTP(parcelId: string, otp: string, travelerId: string) {
    // Verify parcel exists and traveler is authorized
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        trip: {
          include: {
            user: true,
          },
        },
        sender: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.trip || parcel.trip.userId !== travelerId) {
      throw new UnauthorizedException('You are not authorized to deliver this parcel');
    }

    // Check if OTP is set
    if (!parcel.deliveryOtp) {
      throw new BadRequestException('No delivery OTP generated for this parcel');
    }

    // Check if OTP has expired
    if (parcel.deliveryOtpExpiry && new Date() > parcel.deliveryOtpExpiry) {
      throw new BadRequestException('Delivery OTP has expired. Please generate a new one');
    }

    // Verify OTP
    if (parcel.deliveryOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark as delivered
    const now = new Date();
    await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: 'DELIVERED',
        deliveryOtpVerifiedAt: now,
        deliveredAt: now,
      },
    });

    // Update user statistics
    await this.prisma.user.update({
      where: { id: travelerId },
      data: {
        completedDeliveries: {
          increment: 1,
        },
      },
    });

    // Create or update payment record to RELEASED
    const payment = await this.prisma.payment.findUnique({
      where: { parcelId },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { parcelId },
        data: {
          status: 'RELEASED',
          fullyReleasedAt: now,
        },
      });
    }

    return {
      message: 'Delivery confirmed successfully',
      parcel: {
        id: parcel.id,
        title: parcel.title,
        status: 'DELIVERED',
        deliveredAt: now,
      },
      payment: payment ? {
        amount: payment.totalAmount,
        status: 'RELEASED',
      } : null,
    };
  }

  // Mark parcel as picked up
  async markAsPickedUp(parcelId: string, travelerId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        trip: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.trip || parcel.trip.userId !== travelerId) {
      throw new UnauthorizedException('You are not authorized to pick up this parcel');
    }

    if (parcel.status !== 'MATCHED') {
      throw new BadRequestException('Parcel must be in MATCHED status to be picked up');
    }

    await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: 'PICKED_UP',
        pickupVerifiedAt: new Date(),
      },
    });

    return {
      message: 'Parcel marked as picked up',
      parcel: {
        id: parcel.id,
        title: parcel.title,
        status: 'PICKED_UP',
      },
    };
  }

  // Mark parcel as in transit
  async markAsInTransit(parcelId: string, travelerId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        trip: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.trip || parcel.trip.userId !== travelerId) {
      throw new UnauthorizedException('You are not authorized to update this parcel');
    }

    if (parcel.status !== 'PICKED_UP') {
      throw new BadRequestException('Parcel must be picked up before marking as in transit');
    }

    await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: 'IN_TRANSIT',
      },
    });

    return {
      message: 'Parcel marked as in transit',
      parcel: {
        id: parcel.id,
        title: parcel.title,
        status: 'IN_TRANSIT',
      },
    };
  }
}
