import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPaymentNotification(
    reservationId: string,
    amount: number,
    userEmail?: string,
  ): Promise<void> {
    const botToken = this.configService.get<string>('telegram.botToken') ?? '';
    const chatId = this.configService.get<string>('telegram.chatId') ?? '';

    if (!botToken || !chatId) {
      this.logger.warn('Telegram not configured — skipping notification');
      return;
    }

    const emailLine = userEmail ? `\nUsuario: ${userEmail}` : '';
    const text = `✅ Pago confirmado\nReserva: ${reservationId}\nTotal: $${amount.toFixed(2)}${emailLine}`;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot8762969023:AAFpmi5MMVoqHanZbeIAdT8UwXk5Wir-UMw/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        },
      );
      if (!res.ok) {
        this.logger.error(
          `Telegram API error: ${res.status} ${await res.text()}`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send Telegram notification', err);
    }
  }
}
