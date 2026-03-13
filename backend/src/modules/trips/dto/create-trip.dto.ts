import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: '123 Main St, New York, NY' })
  @IsString()
  originAddress: string;

  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  @IsOptional()
  originLat?: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  @IsOptional()
  originLng?: number;

  @ApiProperty({ example: 'ChIJOwg_06VPwokRYv534QaPC8g', required: false })
  @IsOptional()
  @IsString()
  originPlaceId?: string;

  @ApiProperty({ example: '456 Market St, San Francisco, CA' })
  @IsString()
  destAddress: string;

  @ApiProperty({ example: 37.7749 })
  @IsNumber()
  @IsOptional()
  destLat?: number;

  @ApiProperty({ example: -122.4194 })
  @IsNumber()
  @IsOptional()
  destLng?: number;

  @ApiProperty({ example: 'ChIJIQBpAG2ahYAR_6128GcTUEo', required: false })
  @IsOptional()
  @IsString()
  destPlaceId?: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: '2024-12-25T18:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiProperty({ example: 2, description: 'Hours of flexibility' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  flexibility?: number;

  @ApiProperty({ example: 3, description: 'Maximum number of parcels' })
  @IsInt()
  @Min(1)
  @Max(10)
  maxParcels: number;

  @ApiProperty({ example: 5.0, description: 'Maximum weight in kg' })
  @IsNumber()
  @Min(0.1)
  @Max(50)
  maxWeight: number;

  @ApiProperty({
    example: ['DOCUMENT', 'SMALL'],
    description: 'Accepted parcel sizes',
  })
  @IsArray()
  @IsString({ each: true })
  acceptedSizes: string[];

  @ApiProperty({ example: 10.0, description: 'Base price per kg' })
  @IsNumber()
  @Min(0)
  basePricePerKg: number;

  @ApiProperty({ example: 0.5, description: 'Price per km', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKm?: number;

  @ApiProperty({
    example: 'Traveling by car, can make stops along the way',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'CAR', required: false })
  @IsOptional()
  @IsString()
  transportMode?: string;
}
