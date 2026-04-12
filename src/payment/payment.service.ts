import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProcessPaymentDto } from './dto/process-payment.dto';

export interface PaymentResult {
  success: boolean;
  reference: string;
  message: string;
}

/**
 * Mock payment service — replace with a real gateway (Stripe, PayU, etc.).
 *
 * Rules (simulated):
 *   - Tokens starting with "fail_" are always declined.
 *   - Everything else succeeds after a short artificial delay.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async processPayment(dto: ProcessPaymentDto): Promise<PaymentResult> {
    this.logger.log(
      `Processing payment: token=${dto.paymentToken} amount=${dto.amount} ${dto.currency}`,
    );

    if (dto.paymentToken.startsWith('fail_')) {
      throw new BadRequestException('Payment declined by the gateway');
    }

    // Simulate async gateway call
    await this.delay(150);

    const reference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    this.logger.log(`Payment approved: reference=${reference}`);

    return {
      success: true,
      reference,
      message: 'Payment processed successfully',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
