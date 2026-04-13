import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendFirstLoginEmail(to: string, name: string): Promise<void> {
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');

    if (!user || !pass) {
      this.logger.warn('MAIL_USER o MAIL_PASS no configurados');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"Reserva Deportiva" <${user}>`,
      to,
      subject: 'Primer inicio de sesión',
      html: `
        <h2>Hola, ${name}</h2>
        <p>Se detectó tu primer inicio de sesión en la plataforma de reservas deportivas.</p>
        <p>Si no fuiste tú, cambia tu contraseña inmediatamente.</p>
      `,
    });

    this.logger.log(`Correo de primer login enviado a ${to}`);
  }
}