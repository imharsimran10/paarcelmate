import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private configService: ConfigService;

  constructor(configService?: ConfigService) {
    this.configService = configService || new ConfigService();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | object = 'Internal Server Error';

    let validationErrors: any = undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
        // Capture validation errors if present
        if ((exceptionResponse as any).errors) {
          validationErrors = (exceptionResponse as any).errors;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Build response object
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // In development, include full error details
    if (!isProduction) {
      errorResponse.message = message;
      errorResponse.error = error;
      if (validationErrors) {
        errorResponse.errors = validationErrors;
      }
      if (exception instanceof Error && exception.stack) {
        errorResponse.stack = exception.stack.split('\n');
      }
    } else {
      // In production, sanitize error messages
      if (status >= 500) {
        errorResponse.message = 'An unexpected error occurred. Please try again later.';
        errorResponse.error = 'Internal Server Error';
      } else {
        errorResponse.message = message;
        errorResponse.error = error;
        if (validationErrors) {
          errorResponse.errors = validationErrors;
        }
      }
    }

    response.status(status).json(errorResponse);
  }
}
