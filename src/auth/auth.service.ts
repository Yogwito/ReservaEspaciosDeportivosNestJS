import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    return match ? user : null;
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const accessToken = this.signJwt(user);
    return { user, accessToken };
  }

  async login(user: User) {
    // Solo pide 2FA en el primer login; después ya no lo exige
    if (user.isTwoFactorEnabled && !user.firstLoginDone) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
      };
    }
    return { user, accessToken: this.signJwt(user) };
  }

  // ── 2FA Setup ─────────────────────────────────────────────────────────────

  async generate2faSecret(user: User) {
    const appName = this.configService.get<string>('twoFactor.appName')!;
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Temporarily store secret (not yet enabled — confirmed on /2fa/enable)
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
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');

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
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');

    await this.usersService.saveTwoFactorSecret(user.id, null);
    return { message: '2FA disabled successfully' };
  }

  // ── 2FA Login Completion ──────────────────────────────────────────────────

  async authenticate2fa(userId: string, token: string) {
    const user = await this.usersService.findOne(userId);
    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }
    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });
    if (!isValid) throw new UnauthorizedException('Invalid 2FA token');

    // Marcar que ya completó el primer login con 2FA
    await this.usersService.markFirstLoginDone(user.id);

    return { user, accessToken: this.signJwt(user) };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private signJwt(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}