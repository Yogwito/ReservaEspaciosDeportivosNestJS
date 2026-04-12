import {
  IsString,
  IsArray,
  ValidateNested,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'start must be HH:MM (24-hour)',
  })
  start: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'end must be HH:MM (24-hour)',
  })
  end: string;
}

export class CreateSportDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  allowedTimeSlots: TimeSlotDto[];
}
