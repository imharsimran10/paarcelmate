import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Determine if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const isProduction = process.env.NODE_ENV === 'production';

// Build transports array - console always, files only in non-serverless
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context }) => {
        return `${timestamp} [${context}] ${level}: ${message}`;
      }),
    ),
  }),
];

// Add file transports only if NOT in serverless environment
if (!isServerless && !isProduction) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
}

@Module({
  imports: [
    WinstonModule.forRoot({
      transports,
    }),
  ],
})
export class LoggerModule {}
