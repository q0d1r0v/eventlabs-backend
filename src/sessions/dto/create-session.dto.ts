import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  @IsUUID()
  conferenceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsDateString()
  startTime!: string;

  @ApiProperty()
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  virtualLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  speakerId?: string;
}
