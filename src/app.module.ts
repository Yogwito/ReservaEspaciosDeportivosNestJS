import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SpacesModule } from './spaces/spaces.module';
import { SportsModule } from './sports/sports.module';
import { PaymentModule } from './payment/payment.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host') ?? 'localhost',
        port: config.get<number>('database.port') ?? 3306,
        username: config.get<string>('database.username') ?? 'root',
        password: config.get<string>('database.password') ?? '',
        database: config.get<string>('database.name') ?? 'reserva_deportiva',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    ReservationsModule,
    SpacesModule,
    SportsModule,
    PaymentModule,
    MailModule,
  ],
})
export class AppModule {}
