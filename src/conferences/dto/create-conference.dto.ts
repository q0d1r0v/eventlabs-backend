import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConferenceDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: '2026-06-01T09:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-03T18:00:00Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;
}
