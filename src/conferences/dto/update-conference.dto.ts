import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ConferenceStatus } from '@prisma/client';
import { CreateConferenceDto } from './create-conference.dto';

export class UpdateConferenceDto extends PartialType(CreateConferenceDto) {
  @IsOptional()
  @IsEnum(ConferenceStatus)
  status?: ConferenceStatus;
}
