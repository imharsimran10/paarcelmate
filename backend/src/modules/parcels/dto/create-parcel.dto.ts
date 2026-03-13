import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  Min,
  IsEnum,
} from 'class-validator';
import { ParcelSize } from '@prisma/client';

export class CreateParcelDto {
  @ApiProperty({ example: 'John Smith' })
  @IsString()
  recipientName: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ example: 'recipient@example.com', required: false })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiProperty({ example: '123 Main St, New York, NY' })
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  @IsOptional()
  pickupLat?: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  @IsOptional()
  pickupLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pickupPlaceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pickupNotes?: string;

  @ApiProperty({ example: '456 Market St, Boston, MA' })
  @IsString()
  deliveryAddress: string;

  @ApiProperty({ example: 42.3601 })
  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @ApiProperty({ example: -71.0589 })
  @IsNumber()
  @IsOptional()
  deliveryLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryPlaceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiProperty({ example: 'Important Documents' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Legal documents that need to be delivered urgently' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'DOCUMENT', enum: ParcelSize })
  @IsEnum(ParcelSize)
  size: ParcelSize;

  @ApiProperty({ example: 0.5, description: 'Weight in kg' })
  @IsNumber()
  @Min(0.1)
  weight: number;

  @ApiProperty({ example: 100, description: 'Declared value in USD' })
  @IsNumber()
  @Min(0)
  declaredValue: number;

  @ApiProperty({ example: [], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  pickupTimeStart: string;

  @ApiProperty({ example: '2024-12-25T14:00:00Z' })
  @IsDateString()
  pickupTimeEnd: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deliveryTimeStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deliveryTimeEnd?: string;

  @ApiProperty({ example: 'STANDARD', enum: ['FLEXIBLE', 'STANDARD', 'URGENT'] })
  @IsOptional()
  @IsString()
  urgency?: string;

  @ApiProperty({ example: 25.00, description: 'Offered price in USD' })
  @IsNumber()
  @Min(5)
  offeredPrice: number;
}
