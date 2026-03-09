import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Generate random 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
      console.log('\n' + '='.repeat(60));
      console.log(`📦 DELIVERY OTP FOR PARCEL: ${parcel.title}`);
      console.log(`📞 Recipient: ${parcel.recipientName} (${parcel.recipientPhone})`);
      console.log(`🔐 OTP CODE: ${otp}`);
      console.log(`⏰ Valid for: 10 minutes`);
      console.log('='.repeat(60) + '\n');
    }

    // TODO: In production, send SMS/Email to recipient
    // await this.sendDeliveryOTP(parcel.recipientPhone, parcel.recipientEmail, otp);

    return {
      message: 'Delivery OTP generated and sent to recipient',
      recipientPhone: parcel.recipientPhone.slice(-4), // Show last 4 digits only
      recipientName: parcel.recipientName,
      expiresAt: otpExpiry,
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
