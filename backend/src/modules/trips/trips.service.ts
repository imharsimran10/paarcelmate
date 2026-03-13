import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTripDto: CreateTripDto) {
    const {
      originAddress,
      originLat,
      originLng,
      originPlaceId,
      destAddress,
      destLat,
      destLng,
      destPlaceId,
      departureTime,
      arrivalTime,
      flexibility,
      maxParcels,
      maxWeight,
      acceptedSizes,
      basePricePerKg,
      pricePerKm,
      description,
      transportMode,
    } = createTripDto;

    // TODO: Implement proper geocoding for addresses
    // For now, use provided coordinates or default to 0,0
    const trip = await this.prisma.trip.create({
      data: {
        userId,
        originAddress,
        originLat: originLat ?? 0,
        originLng: originLng ?? 0,
        originPlaceId,
        destAddress,
        destLat: destLat ?? 0,
        destLng: destLng ?? 0,
        destPlaceId,
        departureTime: new Date(departureTime),
        arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
        flexibility: flexibility ?? 0,
        maxParcels,
        maxWeight,
        acceptedSizes,
        basePricePerKg,
        pricePerKm,
        description,
        transportMode,
        status: 'DRAFT',
      },
      include: {
        user: {
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
    });

    return trip;
  }

  async findAll(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      this.prisma.trip.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              trustScore: true,
            },
          },
          parcels: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.trip.count({ where: { userId } }),
    ]);

    return {
      data: trips,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
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
        parcels: {
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
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(id: string, userId: string, updateTripDto: UpdateTripDto) {
    // Check ownership
    const trip = await this.prisma.trip.findUnique({ where: { id } });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this trip');
    }

    // Convert dates if provided
    const updateData: any = { ...updateTripDto };
    if (updateTripDto.departureTime) {
      updateData.departureTime = new Date(updateTripDto.departureTime);
    }
    if (updateTripDto.arrivalTime) {
      updateData.arrivalTime = new Date(updateTripDto.arrivalTime);
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
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
    });

    return updatedTrip;
  }

  async publish(id: string, userId: string) {
    // Check ownership
    const trip = await this.prisma.trip.findUnique({ where: { id } });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Not authorized to publish this trip');
    }

    const publishedTrip = await this.prisma.trip.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // TODO: Trigger matching algorithm to find relevant parcels
    // TODO: Send notifications to potential senders

    return publishedTrip;
  }

  async cancel(id: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        parcels: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this trip');
    }

    // Check if there are active parcels
    const activeParcels = trip.parcels.filter((p) =>
      ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(p.status),
    );

    if (activeParcels.length > 0) {
      throw new ForbiddenException(
        'Cannot cancel trip with active parcels. Please complete or cancel parcels first.',
      );
    }

    const cancelledTrip = await this.prisma.trip.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // TODO: Notify affected senders

    return cancelledTrip;
  }

  async search(searchTripsDto: SearchTripsDto, page: number = 1, limit: number = 20) {
    const {
      originLat,
      originLng,
      destLat,
      destLng,
      radiusKm = 50,
      departureAfter,
      departureBefore,
      minTrustScore,
      transportMode,
    } = searchTripsDto;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TripWhereInput = {
      status: { in: ['DRAFT', 'PUBLISHED'] }, // Include both DRAFT and PUBLISHED
      ...(departureAfter && {
        departureTime: {
          gte: new Date(departureAfter),
          ...(departureBefore && { lte: new Date(departureBefore) }),
        },
      }),
      ...(minTrustScore && {
        user: {
          trustScore: {
            gte: minTrustScore,
          },
        },
      }),
      ...(transportMode && { transportMode }),
    };

    // Get trips
    const trips = await this.prisma.trip.findMany({
      where,
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
        parcels: {
          where: {
            status: { notIn: ['CANCELLED', 'DELIVERED'] },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { departureTime: 'asc' },
      skip,
      take: limit,
    });

    // Filter by geospatial distance
    // TODO: Use PostGIS for more efficient geospatial queries
    const filteredTrips = trips.filter((trip) => {
      const originDistance = this.calculateDistance(
        originLat,
        originLng,
        trip.originLat,
        trip.originLng,
      );
      const destDistance = this.calculateDistance(
        destLat,
        destLng,
        trip.destLat,
        trip.destLng,
      );

      return originDistance <= radiusKm && destDistance <= radiusKm;
    });

    const total = filteredTrips.length;

    return {
      data: filteredTrips,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async complete(id: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        parcels: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Not authorized to complete this trip');
    }

    // Check if all parcels are delivered
    const undeliveredParcels = trip.parcels.filter((p) =>
      ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(p.status),
    );

    if (undeliveredParcels.length > 0) {
      throw new ForbiddenException(
        'Cannot complete trip with undelivered parcels',
      );
    }

    const completedTrip = await this.prisma.trip.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Update user statistics
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        completedTrips: { increment: 1 },
      },
    });

    return completedTrip;
  }

  async remove(id: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        parcels: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this trip');
    }

    if (trip.parcels.length > 0) {
      throw new ForbiddenException('Cannot delete trip with associated parcels');
    }

    await this.prisma.trip.delete({ where: { id } });

    return { message: 'Trip deleted successfully' };
  }

  // Helper function to calculate distance between two coordinates
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
