import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ProcessPaymentDto } from '../payment/dto/process-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /** Create a reservation (starts in PENDING_PAYMENT state) */
  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: User) {
    return this.reservationsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.reservationsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.reservationsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: User,
  ) {
    return this.reservationsService.update(id, dto, user);
  }

  /** Cancel a reservation (sets status to CANCELLED) */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.reservationsService.cancel(id, user);
  }

  /**
   * Confirm payment → transitions reservation to ACTIVE.
   *
   * Body: { paymentToken, amount, currency }
   * Use paymentToken starting with "fail_" to simulate a declined payment.
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.reservationsService.pay(id, dto, user);
  }

  /** Hard delete — admin only (enforced inside the service) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.reservationsService.remove(id, user);
  }
}
