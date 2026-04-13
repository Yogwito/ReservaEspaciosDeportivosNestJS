import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({ ...dto, password: hashed });
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const patch = dto as Partial<{
      email: string;
      name: string;
      password: string;
      role: string;
    }>;
    if (patch.password) {
      patch.password = await bcrypt.hash(patch.password, 12);
    }
    Object.assign(user, patch);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async saveTwoFactorSecret(id: string, secret: string | null): Promise<void> {
    await this.usersRepository.update(id, {
      twoFactorSecret: secret,
      isTwoFactorEnabled: secret !== null,
    });
  }

  /** Marca que el usuario ya completó su primer login con 2FA */
  async markFirstLoginDone(id: string): Promise<void> {
    await this.usersRepository.update(id, { firstLoginDone: true });
  }

  async setVerificationCode(
    id: string,
    code: string,
    expiry: number,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      emailVerificationCode: code,
      emailVerificationExpiry: expiry,
    });
  }

  async verifyEmail(id: string, code: string): Promise<void> {
    const user = await this.findOne(id);
    if (
      user.emailVerificationCode !== code ||
      !user.emailVerificationExpiry ||
      Date.now() > Number(user.emailVerificationExpiry)
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    await this.usersRepository.update(id, {
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null,
    });
  }
}
