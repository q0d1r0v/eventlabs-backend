import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty()
  @IsUUID()
  sessionId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  text!: string;
}
