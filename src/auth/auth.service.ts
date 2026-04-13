import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    return match ? user : null;
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000;
    await this.usersService.setVerificationCode(user.id, code, expiry);
    await this.mailService.sendVerificationEmail(user.email, code);
    return {
      message: 'Registro exitoso. Revisa tu correo para obtener el código de verificación.',
      userId: user.id,
    };
  }

  async verifyEmail(userId: string, code: string) {
    await this.usersService.verifyEmail(userId, code);
    const user = await this.usersService.findOne(userId);
    return { user, accessToken: this.signJwt(user) };
  }

  async login(user: User) {
    if (user.isTwoFactorEnabled && !user.firstLoginDone) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
      };
    }

    if (!user.firstLoginDone) {
      console.log('ENTRÓ A PRIMER LOGIN:', user.email);

      await this.handleFirstLoginEmail(user);

      console.log('ANTES DE markFirstLoginDone:', user.id);
      await this.usersService.markFirstLoginDone(user.id);
      console.log('DESPUÉS DE markFirstLoginDone');

      user.firstLoginDone = true;
    }

    return { user, accessToken: this.signJwt(user) };
  }

  async generate2faSecret(user: User) {
    const appName = this.configService.get<string>('twoFactor.appName')!;
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.usersService.saveTwoFactorSecret(user.id, secret);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enable2fa(user: User, token: string) {
    const freshUser = await this.usersService.findOne(user.id);

    if (!freshUser.twoFactorSecret) {
      throw new BadRequestException(
        'Generate a 2FA secret first via POST /auth/2fa/generate',
      );
    }

    const isValid = authenticator.verify({
      token,
      secret: freshUser.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.usersService.saveTwoFactorSecret(
      user.id,
      freshUser.twoFactorSecret,
    );

    return { message: '2FA enabled successfully' };
  }

  async disable2fa(user: User, token: string) {
    const freshUser = await this.usersService.findOne(user.id);

    if (!freshUser.isTwoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = authenticator.verify({
      token,
      secret: freshUser.twoFactorSecret!,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.usersService.saveTwoFactorSecret(user.id, null);

    return { message: '2FA disabled successfully' };
  }

  async authenticate2fa(userId: string, token: string) {
    const user = await this.usersService.findOne(userId);

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    if (!user.firstLoginDone) {
      await this.handleFirstLoginEmail(user);
      await this.usersService.markFirstLoginDone(user.id);
      user.firstLoginDone = true;
    }

    return { user, accessToken: this.signJwt(user) };
  }

  private signJwt(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async handleFirstLoginEmail(user: User): Promise<void> {
    try {
      console.log('INTENTANDO ENVIAR CORREO A:', user.email);
      await this.mailService.sendFirstLoginEmail(user.email, user.name);
      console.log('CORREO ENVIADO OK A:', user.email);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de primer login a ${user.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}