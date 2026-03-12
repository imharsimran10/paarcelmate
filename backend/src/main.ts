import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { PrismaService } from './common/services/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS Configuration
  const isProduction = configService.get('NODE_ENV') === 'production';
  const corsOrigins = configService.get('CORS_ORIGINS');

  if (isProduction && !corsOrigins) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }

  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : (isProduction ? [] : '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });

  // Compression
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(configService.get('API_PREFIX') || 'api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => {
          const constraints = error.constraints || {};
          return {
            field: error.property,
            errors: Object.values(constraints),
          };
        });
        return new (require('@nestjs/common').BadRequestException)({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Global exception filter for production error sanitization
  app.useGlobalFilters(new HttpExceptionFilter(configService));

  // Prisma shutdown hook
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Swagger Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PaarcelMate API')
      .setDescription('P2P Parcel Delivery Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('trips', 'Traveler trip management')
      .addTag('parcels', 'Parcel management')
      .addTag('matching', 'Matching algorithm')
      .addTag('payments', 'Payment and escrow')
      .addTag('tracking', 'Real-time tracking')
      .addTag('reviews', 'Reviews and ratings')
      .addTag('notifications', 'Notifications')
      .addTag('admin', 'Admin operations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('API_PORT') || 3000;
  await app.listen(port);

  console.log(`
    🚀 PaarcelMate API is running!
    📡 URL: http://localhost:${port}
    📚 Docs: http://localhost:${port}/api/docs
    🌍 Environment: ${configService.get('NODE_ENV')}
  `);
}

bootstrap();
