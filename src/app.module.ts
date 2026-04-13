import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { LoggerMiddleware } from './middleware/logger.middleware';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SportsModule } from './sports/sports.module';
import { SpacesModule } from './spaces/spaces.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PaymentModule } from './payment/payment.module';

import { MailModule } from './mail/mail.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
        autoLoadEntities: true,
      }),
    }),
    MailModule,

    AuthModule,
    UsersModule,
    SportsModule,
    SpacesModule,
    ReservationsModule,
    PaymentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
