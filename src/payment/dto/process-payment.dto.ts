import { IsString, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  @IsString()
  paymentToken: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
