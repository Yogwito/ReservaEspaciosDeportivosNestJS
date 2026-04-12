import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Envía un mensaje de Telegram cuando se confirma un pago.
   * Usa fetch nativo de Node.js — no requiere librerías externas.
   */
  async sendPaymentNotification(
    reservationId: string,
    amount: number,
  ): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');
    const chatId = this.configService.get<string>('telegram.chatId');

    // Si no hay token configurado, solo se loguea y se omite el envío
    if (!token || !chatId) {
      this.logger.warn('Telegram no configurado. Omitiendo notificación.');
      return;
    }

    const text = `✅ Pago confirmado para la reserva #${reservationId}. Monto: $${amount.toFixed(2)}`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      if (!response.ok) {
        this.logger.error(`Telegram respondió con error: ${response.status}`);
      } else {
        this.logger.log(`Notificación Telegram enviada para reserva ${reservationId}`);
      }
    } catch (err) {
      // No lanzamos el error — el pago ya fue confirmado, solo fallé la notificación
      this.logger.error('Error enviando notificación Telegram', err);
    }
  }
}
