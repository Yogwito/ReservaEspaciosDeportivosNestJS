import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host') ?? 'smtp.gmail.com',
      port: this.configService.get<number>('mail.port') ?? 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user') ?? '',
        pass: this.configService.get<string>('mail.pass') ?? '',
      },
    });
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    const from =
      this.configService.get<string>('mail.from') ??
      this.configService.get<string>('mail.user');
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Verifica tu cuenta — SportsFacility',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Verifica tu correo electrónico</h2>
            <p>Usa este código para completar tu registro. Expira en <strong>15 minutos</strong>.</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;
                        padding:24px;background:#f4f4f4;border-radius:8px;margin:24px 0">
              ${code}
            </div>
            <p style="color:#888;font-size:12px">Si no creaste esta cuenta, ignora este correo.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}`, err);
      throw err;
    }
  }

  async sendFirstLoginEmail(to: string, name: string): Promise<void> {
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');

    if (!user || !pass) {
      this.logger.warn('MAIL_USER o MAIL_PASS no configurados');
      return;
    }

    await this.transporter.sendMail({
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
