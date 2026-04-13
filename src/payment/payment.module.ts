import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentService, TelegramService],
  exports: [PaymentService, TelegramService],
})
export class PaymentModule {}
