import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TelegramService } from './telegram.service';

@Module({
  providers: [PaymentService, TelegramService],
  exports: [PaymentService, TelegramService],
})
export class PaymentModule {}
