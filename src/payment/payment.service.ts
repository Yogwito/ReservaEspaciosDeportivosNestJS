import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Injectable()
export class PaymentService {
  async processPayment(dto: ProcessPaymentDto): Promise<{ reference: string }> {
    if (dto.paymentToken.startsWith('fail_')) {
      throw new BadRequestException('Payment declined');
    }
    return { reference: uuid() };
  }
}
