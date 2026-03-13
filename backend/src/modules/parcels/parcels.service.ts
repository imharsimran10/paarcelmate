import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { SearchParcelsDto } from './dto/search-parcels.dto';

@Injectable()
export class ParcelsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createParcelDto: CreateParcelDto) {
    // TODO: Implement proper geocoding for addresses
    // For now, use provided coordinates or default to 0,0
    const parcel = await this.prisma.parcel.create({
      data: {
        senderId: userId,
        ...createParcelDto,
        pickupLat: createParcelDto.pickupLat ?? 0,
        pickupLng: createParcelDto.pickupLng ?? 0,
        deliveryLat: createParcelDto.deliveryLat ?? 0,
        deliveryLng: createParcelDto.deliveryLng ?? 0,
        pickupTimeStart: new Date(createParcelDto.pickupTimeStart),
        pickupTimeEnd: new Date(createParcelDto.pickupTimeEnd),
        deliveryTimeStart: createParcelDto.deliveryTimeStart
          ? new Date(createParcelDto.deliveryTimeStart)
          : null,
        deliveryTimeEnd: createParcelDto.deliveryTimeEnd
          ? new Date(createParcelDto.deliveryTimeEnd)
          : null,
        status: 'DRAFT',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            trustScore: true,
          },
        },
      },
    });

    return parcel;
  }

  async findAll(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [parcels, total] = await Promise.all([
      this.prisma.parcel.findMany({
        where: { senderId: userId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          trip: {
            select: {
              id: true,
              status: true,
              departureTime: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  trustScore: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.parcel.count({ where: { senderId: userId } }),
    ]);

    return {
      data: parcels,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            trustScore: true,
            averageRating: true,
          },
        },
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                trustScore: true,
                averageRating: true,
                isVerified: true,
              },
            },
          },
        },
        payment: true,
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    return parcel;
  }

  async update(id: string, userId: string, updateParcelDto: UpdateParcelDto) {
    const parcel = await this.prisma.parcel.findUnique({ where: { id } });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.senderId !== userId) {
      throw new ForbiddenException('Not authorized to update this parcel');
    }

    const updateData: any = { ...updateParcelDto };
    if (updateParcelDto.pickupTimeStart) {
      updateData.pickupTimeStart = new Date(updateParcelDto.pickupTimeStart);
    }
    if (updateParcelDto.pickupTimeEnd) {
      updateData.pickupTimeEnd = new Date(updateParcelDto.pickupTimeEnd);
    }

    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: updateData,
    });

    return updatedParcel;
  }

  async publish(id: string, userId: string) {
    const parcel = await this.prisma.parcel.findUnique({ where: { id } });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.senderId !== userId) {
      throw new ForbiddenException('Not authorized to publish this parcel');
    }

    const publishedParcel = await this.prisma.parcel.update({
      where: { id },
      data: { status: 'REQUESTING' },
    });

    // TODO: Trigger matching algorithm
    // TODO: Notify potential travelers

    return publishedParcel;
  }

  async cancel(id: string, userId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.senderId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this parcel');
    }

    if (['DELIVERED', 'CANCELLED'].includes(parcel.status)) {
      throw new ForbiddenException('Parcel is already completed or cancelled');
    }

    await this.prisma.parcel.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // TODO: Process refund if payment exists

    return { message: 'Parcel cancelled successfully' };
  }

  async remove(id: string, userId: string) {
    const parcel = await this.prisma.parcel.findUnique({ where: { id } });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.senderId !== userId) {
      throw new ForbiddenException('Not authorized to delete this parcel');
    }

    if (parcel.status !== 'DRAFT') {
      throw new ForbiddenException('Can only delete draft parcels');
    }

    await this.prisma.parcel.delete({ where: { id } });

    return { message: 'Parcel deleted successfully' };
  }

  async search(searchDto: SearchParcelsDto, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: { in: ['DRAFT', 'REQUESTING'] }, // Include both DRAFT and REQUESTING
      tripId: null, // Only show parcels that haven't been matched yet
    };

    // Only filter by pickup time if specified
    if (searchDto.pickupAfter) {
      where.pickupTimeStart = {
        gte: new Date(searchDto.pickupAfter),
      };
    }

    if (searchDto.maxWeight) {
      where.weight = { lte: searchDto.maxWeight };
    }

    if (searchDto.size) {
      where.size = searchDto.size;
    }

    const [parcels, total] = await Promise.all([
      this.prisma.parcel.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              trustScore: true,
              averageRating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.parcel.count({ where }),
    ]);

    return {
      data: parcels,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async acceptParcel(parcelId: string, tripId: string, travelerId: string) {
    // Verify the parcel exists and is available
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        sender: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.tripId) {
      throw new ForbiddenException('Parcel is already assigned to a trip');
    }

    if (!['DRAFT', 'REQUESTING', 'PENDING'].includes(parcel.status)) {
      throw new ForbiddenException('Parcel is not available for acceptance');
    }

    // Verify the trip exists and belongs to the traveler
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== travelerId) {
      throw new ForbiddenException('Not authorized to use this trip');
    }

    // Check if a match request already exists
    const existingRequest = await this.prisma.matchRequest.findFirst({
      where: {
        parcelId: parcelId,
        tripId: tripId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new ForbiddenException('A match request already exists for this parcel and trip');
    }

    // Create a match request that the sender needs to approve
    const matchRequest = await this.prisma.matchRequest.create({
      data: {
        parcelId: parcelId,
        tripId: tripId,
        requesterId: travelerId,
        approverId: parcel.senderId,
        requestType: 'TRAVELER_REQUEST',
        status: 'PENDING',
      },
      include: {
        parcel: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    // Create notification for the sender
    await this.prisma.notification.create({
      data: {
        userId: parcel.senderId,
        type: 'MATCH_REQUEST',
        title: 'New Delivery Request',
        message: `${trip.user.firstName} ${trip.user.lastName} wants to deliver your parcel from ${parcel.pickupAddress} to ${parcel.deliveryAddress}`,
        data: {
          matchRequestId: matchRequest.id,
          parcelId: parcelId,
          tripId: tripId,
          travelerId: travelerId,
        },
      },
    });

    return matchRequest;
  }

  async requestTraveler(parcelId: string, tripId: string, senderId: string) {
    // Verify the parcel exists and belongs to the sender
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.senderId !== senderId) {
      throw new ForbiddenException('Not authorized to request for this parcel');
    }

    if (parcel.tripId) {
      throw new ForbiddenException('Parcel is already assigned to a trip');
    }

    if (!['DRAFT', 'REQUESTING', 'PENDING'].includes(parcel.status)) {
      throw new ForbiddenException('Parcel is not available for matching');
    }

    // Verify the trip exists
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check if a match request already exists
    const existingRequest = await this.prisma.matchRequest.findFirst({
      where: {
        parcelId: parcelId,
        tripId: tripId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new ForbiddenException('A match request already exists for this parcel and trip');
    }

    // Create a match request that the traveler needs to approve
    const matchRequest = await this.prisma.matchRequest.create({
      data: {
        parcelId: parcelId,
        tripId: tripId,
        requesterId: senderId,
        approverId: trip.userId,
        requestType: 'SENDER_REQUEST',
        status: 'PENDING',
      },
      include: {
        parcel: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    // Create notification for the traveler
    await this.prisma.notification.create({
      data: {
        userId: trip.userId,
        type: 'MATCH_REQUEST',
        title: 'New Parcel Delivery Request',
        message: `${parcel.recipientName} wants you to deliver a parcel from ${parcel.pickupAddress} to ${parcel.deliveryAddress}`,
        data: {
          matchRequestId: matchRequest.id,
          parcelId: parcelId,
          tripId: tripId,
          senderId: senderId,
        },
      },
    });

    return matchRequest;
  }

  async approveMatchRequest(matchRequestId: string, approverId: string) {
    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
      include: {
        parcel: true,
        trip: true,
      },
    });

    if (!matchRequest) {
      throw new NotFoundException('Match request not found');
    }

    if (matchRequest.approverId !== approverId) {
      throw new ForbiddenException('Not authorized to approve this match request');
    }

    if (matchRequest.status !== 'PENDING') {
      throw new ForbiddenException('Match request is no longer pending');
    }

    // Update match request status
    await this.prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: { status: 'APPROVED' },
    });

    // Update parcel to link with trip
    const updatedParcel = await this.prisma.parcel.update({
      where: { id: matchRequest.parcelId },
      data: {
        tripId: matchRequest.tripId,
        status: 'MATCHED',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
          },
        },
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    // Notify the requester that their request was approved
    await this.prisma.notification.create({
      data: {
        userId: matchRequest.requesterId,
        type: 'MATCH_APPROVED',
        title: 'Match Request Approved! 🎉',
        message: `Your delivery request has been approved! Contact details are now available. You can coordinate pickup/delivery via Messages.`,
        data: {
          matchRequestId: matchRequestId,
          parcelId: matchRequest.parcelId,
          tripId: matchRequest.tripId,
        },
      },
    });

    // Create an initial welcome message to start the conversation
    const welcomeMessage = matchRequest.requestType === 'TRAVELER_REQUEST'
      ? `Hi! I'm excited to deliver your parcel from ${matchRequest.parcel.pickupAddress} to ${matchRequest.parcel.deliveryAddress}. Let's coordinate the pickup details!`
      : `Hi! Thank you for agreeing to deliver my parcel. Looking forward to working with you!`;

    await this.prisma.message.create({
      data: {
        parcelId: matchRequest.parcelId,
        senderId: matchRequest.requesterId,
        receiverId: matchRequest.approverId,
        content: welcomeMessage,
      },
    });

    return updatedParcel;
  }

  async rejectMatchRequest(matchRequestId: string, approverId: string) {
    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
    });

    if (!matchRequest) {
      throw new NotFoundException('Match request not found');
    }

    if (matchRequest.approverId !== approverId) {
      throw new ForbiddenException('Not authorized to reject this match request');
    }

    if (matchRequest.status !== 'PENDING') {
      throw new ForbiddenException('Match request is no longer pending');
    }

    // Update match request status
    await this.prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: { status: 'REJECTED' },
    });

    // Notify the requester that their request was rejected
    await this.prisma.notification.create({
      data: {
        userId: matchRequest.requesterId,
        type: 'MATCH_REJECTED',
        title: 'Match Request Declined',
        message: `Your match request was declined.`,
        data: {
          matchRequestId: matchRequestId,
          parcelId: matchRequest.parcelId,
          tripId: matchRequest.tripId,
        },
      },
    });

    return { message: 'Match request rejected' };
  }

  async getMatchRequestsForUser(userId: string) {
    const requests = await this.prisma.matchRequest.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
      },
      include: {
        parcel: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async getMyDeliveries(travelerId: string) {
    // Get all parcels assigned to traveler's trips
    const parcels = await this.prisma.parcel.findMany({
      where: {
        trip: {
          userId: travelerId,
        },
        status: { in: ['MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] },
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profilePhoto: true,
            trustScore: true,
            averageRating: true,
          },
        },
        trip: {
          select: {
            id: true,
            originAddress: true,
            destAddress: true,
            departureTime: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return parcels;
  }

  async getMySentParcels(senderId: string) {
    // Get all parcels sent by user with their assigned trips
    const parcels = await this.prisma.parcel.findMany({
      where: {
        senderId: senderId,
        tripId: { not: null },
        status: { in: ['MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] },
      },
      include: {
        trip: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profilePhoto: true,
                trustScore: true,
                averageRating: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return parcels;
  }
}
