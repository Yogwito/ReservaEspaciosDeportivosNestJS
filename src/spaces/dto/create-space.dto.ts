import { IsString, IsInt, IsNumber, Min, IsArray, IsUUID, IsOptional } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsInt()
  @Min(1)
  capacity: number;

  /** Precio por hora por persona */
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allowedSportIds?: string[];
}
