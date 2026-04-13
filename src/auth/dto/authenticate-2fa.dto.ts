import { IsString, IsUUID, Length } from 'class-validator';

export class Authenticate2faDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Length(6, 6)
  token!: string;
}
