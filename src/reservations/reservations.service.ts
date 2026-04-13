import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SpacesService } from '../spaces/spaces.service';
import { SportsService } from '../sports/sports.service';
import { PaymentService } from '../payment/payment.service';
import { TelegramService } from '../payment/telegram.service';
import { ProcessPaymentDto } from '../payment/dto/process-payment.dto';
import { User } from '../users/entities/user.entity';
import { Space } from '../spaces/entities/space.entity';
import { Sport } from '../sports/entities/sport.entity';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

/** Convierte "HH:MM" a minutos desde medianoche para comparar horarios */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly spacesService: SpacesService,
    private readonly sportsService: SportsService,
    private readonly paymentService: PaymentService,
    private readonly telegramService: TelegramService,
  ) {}

  async create(dto: CreateReservationDto, user: User): Promise<Reservation> {
    const space = await this.spacesService.findOne(dto.spaceId);
    const sport = await this.sportsService.findOne(dto.sportId);

    // ── Regla 1: start < end ────────────────────────────────────────────────
    const startMin = toMinutes(dto.startTime);
    const endMin = toMinutes(dto.endTime);
    if (startMin >= endMin) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // ── Regla 2: el deporte debe estar permitido en el espacio ──────────────
    const sportAllowed = space.allowedSports.some((s) => s.id === dto.sportId);
    if (!sportAllowed) {
      throw new BadRequestException(
        `Sport "${sport.name}" is not allowed in space "${space.name}"`,
      );
    }

    // ── Regla 3: el horario debe estar dentro de los slots del deporte ──────
    this.assertTimeSlot(sport, dto.startTime, dto.endTime);

    // ── Regla 4: numPeople <= capacidad ─────────────────────────────────────
    this.assertCapacity(space, dto.numPeople);

    // ── Regla 5: no superponerse con otras reservas del mismo espacio/fecha ─
    await this.assertNoOverlap(dto.spaceId, dto.date, dto.startTime, dto.endTime);

    // ── Calcular precio ──────────────────────────────────────────────────────
    const durationHours = (endMin - startMin) / 60;
    const unitPrice = space.hourlyRate;
    const totalValue = unitPrice * durationHours * dto.numPeople;

    const reservation = this.reservationsRepository.create({
      ...dto,
      userId: user.id,
      unitPrice,
      totalValue,
      status: ReservationStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
    });
    return this.reservationsRepository.save(reservation);
  }

  findAll(user: User): Promise<Reservation[]> {
    // Admins ven todo; usuarios normales solo ven las suyas
    if (user.role === UserRole.ADMIN) {
      return this.reservationsRepository.find({
        relations: ['user', 'space', 'sport'],
      });
    }
    return this.reservationsRepository.find({
      where: { userId: user.id },
      relations: ['space', 'sport'],
    });
  }

  async findOne(id: string, user: User): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user', 'space', 'sport'],
    });
    if (!reservation) throw new NotFoundException(`Reservation ${id} not found`);
    this.assertOwnerOrAdmin(reservation, user);
    return reservation;
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    user: User,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, user);

    // Tomar los valores actualizados (o los que ya tenía si no se envió el campo)
    const spaceId = dto.spaceId ?? reservation.spaceId;
    const sportId = dto.sportId ?? reservation.sportId;
    const date = dto.date ?? reservation.date;
    const startTime = dto.startTime ?? reservation.startTime;
    const endTime = dto.endTime ?? reservation.endTime;
    const numPeople = dto.numPeople ?? reservation.numPeople;

    // Solo re-validar si cambió algún campo relevante
    const changed =
      dto.spaceId !== undefined ||
      dto.sportId !== undefined ||
      dto.date !== undefined ||
      dto.startTime !== undefined ||
      dto.endTime !== undefined ||
      dto.numPeople !== undefined;

    if (changed) {
      const space = await this.spacesService.findOne(spaceId);
      const sport = await this.sportsService.findOne(sportId);

      const startMin = toMinutes(startTime);
      const endMin = toMinutes(endTime);

      if (startMin >= endMin) {
        throw new BadRequestException('startTime must be before endTime');
      }

      // Verificar que el deporte esté permitido en el espacio
      const sportAllowed = space.allowedSports.some((s) => s.id === sportId);
      if (!sportAllowed) {
        throw new BadRequestException(
          `Sport "${sport.name}" is not allowed in space "${space.name}"`,
        );
      }

      this.assertTimeSlot(sport, startTime, endTime);
      this.assertCapacity(space, numPeople);
      await this.assertNoOverlap(spaceId, date, startTime, endTime, id);

      // Recalcular precio si cambió algo relevante
      const durationHours = (endMin - startMin) / 60;
      reservation.unitPrice = space.hourlyRate;
      reservation.totalValue = space.hourlyRate * durationHours * numPeople;
    }

    // Aplicar los cambios a la reserva
    if (dto.spaceId !== undefined) reservation.spaceId = dto.spaceId;
    if (dto.sportId !== undefined) reservation.sportId = dto.sportId;
    if (dto.date !== undefined) reservation.date = dto.date;
    if (dto.startTime !== undefined) reservation.startTime = dto.startTime;
    if (dto.endTime !== undefined) reservation.endTime = dto.endTime;
    if (dto.numPeople !== undefined) reservation.numPeople = dto.numPeople;

    return this.reservationsRepository.save(reservation);
  }

  async cancel(id: string, user: User): Promise<Reservation> {
    const reservation = await this.findOne(id, user);
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }
    reservation.status = ReservationStatus.CANCELLED;
    return this.reservationsRepository.save(reservation);
  }

  async remove(id: string, user: User): Promise<void> {
    const reservation = await this.findOne(id, user);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can permanently delete reservations');
    }
    await this.reservationsRepository.remove(reservation);
  }

  // ── Pago ──────────────────────────────────────────────────────────────────

  async pay(
    id: string,
    paymentDto: ProcessPaymentDto,
    user: User,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, user);

    if (reservation.paymentStatus === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Reservation is already paid');
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled reservation');
    }

    // Marcar como en proceso mientras se llama al gateway
    reservation.paymentStatus = PaymentStatus.PROCESSING;
    await this.reservationsRepository.save(reservation);

    try {
      // Usamos el totalValue calculado en el backend, ignoramos el amount del body
      const result = await this.paymentService.processPayment({
        paymentToken: paymentDto.paymentToken,
        amount: reservation.totalValue,
        currency: paymentDto.currency,
      });

      reservation.paymentStatus = PaymentStatus.CONFIRMED;
      reservation.status = ReservationStatus.ACTIVE;
      reservation.paymentReference = result.reference;
      const saved = await this.reservationsRepository.save(reservation);

      // Enviar notificación por Telegram (si está configurado)
      await this.telegramService.sendPaymentNotification(
        reservation.id,
        reservation.totalValue,
      );

      return saved;
    } catch (err) {
      reservation.paymentStatus = PaymentStatus.FAILED;
      await this.reservationsRepository.save(reservation);
      throw err;
    }
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  /**
   * Verifica que el horario esté dentro de los slots permitidos del deporte.
   * Solo se bloquean reservas que NO están canceladas.
   */
  private async assertNoOverlap(
    spaceId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    // Bloquear ACTIVE, PENDING_PAYMENT, y cualquier estado que no sea CANCELLED
    const existing = await this.reservationsRepository.find({
      where: {
        spaceId,
        date,
        status: Not(ReservationStatus.CANCELLED),
      },
    });

    const conflict = existing.find((r) => {
      if (excludeId && r.id === excludeId) return false;
      // Hay traslape si: inicioExistente < nuevoFin Y finExistente > nuevoInicio
      return (
        toMinutes(r.startTime) < endMin && toMinutes(r.endTime) > startMin
      );
    });

    if (conflict) {
      throw new BadRequestException(
        `Time slot ${startTime}–${endTime} overlaps with an existing reservation (${conflict.startTime}–${conflict.endTime})`,
      );
    }
  }

  /** Verifica que el horario esté dentro de los slots permitidos del deporte */
  private assertTimeSlot(sport: Sport, startTime: string, endTime: string): void {
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    const slotOk = sport.allowedTimeSlots.some(
      (slot) =>
        startMin >= toMinutes(slot.start) && endMin <= toMinutes(slot.end),
    );
    if (!slotOk) {
      const slots = sport.allowedTimeSlots
        .map((s) => `${s.start}–${s.end}`)
        .join(', ');
      throw new BadRequestException(
        `Requested time ${startTime}–${endTime} is outside ${sport.name}'s allowed slots: ${slots}`,
      );
    }
  }

  /** Verifica que numPeople no exceda la capacidad del espacio */
  private assertCapacity(space: Space, numPeople: number): void {
    if (numPeople > space.capacity) {
      throw new BadRequestException(
        `numPeople (${numPeople}) exceeds space capacity (${space.capacity})`,
      );
    }
  }

  private assertOwnerOrAdmin(reservation: Reservation, user: User): void {
    if (user.role !== UserRole.ADMIN && reservation.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to access this reservation',
      );
    }
  }
}
