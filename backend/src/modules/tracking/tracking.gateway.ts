import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const configService = new ConfigService();
      const corsOrigins = configService.get('CORS_ORIGINS');
      const isProduction = configService.get('NODE_ENV') === 'production';

      if (!isProduction) {
        // Allow all origins in development
        callback(null, true);
      } else if (corsOrigins) {
        // Check if origin is in allowed list
        const allowedOrigins = corsOrigins.split(',').map(o => o.trim());
        if (allowedOrigins.includes(origin) || !origin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        callback(new Error('CORS not configured'));
      }
    },
    credentials: true,
  },
})
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinParcelTracking')
  handleJoinTracking(
    @MessageBody() data: { parcelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`parcel_${data.parcelId}`);
    return { event: 'joined', parcelId: data.parcelId };
  }

  @SubscribeMessage('updateLocation')
  handleLocationUpdate(
    @MessageBody() data: { parcelId: string; latitude: number; longitude: number },
  ) {
    this.server.to(`parcel_${data.parcelId}`).emit('locationUpdate', {
      parcelId: data.parcelId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });
  }

  broadcastParcelUpdate(parcelId: string, update: any) {
    this.server.to(`parcel_${parcelId}`).emit('parcelUpdate', update);
  }
}
