import { IsString, IsNumber, Min, IsIn, IsOptional } from 'class-validator';

export class ProcessPaymentDto {
  /** Token simulado de tarjeta/billetera. Usar "fail_" al inicio para simular rechazo */
  @IsString()
  paymentToken: string;

  /** El monto real se calcula en el backend; este campo se ignora */
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsIn(['COP', 'USD', 'EUR'])
  currency: string;
}
