import {
  IsUUID,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  spaceId!: string;

  @IsUUID()
  sportId!: string;

  /** ISO date string, e.g. "2025-06-15" */
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be HH:MM (24-hour)',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be HH:MM (24-hour)',
  })
  endTime!: string;

  @IsInt()
  @Min(1)
  numPeople!: number;
}
