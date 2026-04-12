import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Authenticate2faDto } from './dto/authenticate-2fa.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  login(@CurrentUser() user: User, @Body() _dto: LoginDto) {
    return this.authService.login(user);
  }

  // ── 2FA Setup (requires existing JWT) ─────────────────────────────────────

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  generate2fa(@CurrentUser() user: User) {
    return this.authService.generate2faSecret(user);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  enable2fa(@CurrentUser() user: User, @Body() dto: Verify2faDto) {
    return this.authService.enable2fa(user, dto.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  disable2fa(@CurrentUser() user: User, @Body() dto: Verify2faDto) {
    return this.authService.disable2fa(user, dto.token);
  }

  // ── 2FA Login completion (no JWT needed) ──────────────────────────────────

  @Post('2fa/authenticate')
  @HttpCode(HttpStatus.OK)
  authenticate2fa(@Body() dto: Authenticate2faDto) {
    return this.authService.authenticate2fa(dto.userId, dto.token);
  }
}
