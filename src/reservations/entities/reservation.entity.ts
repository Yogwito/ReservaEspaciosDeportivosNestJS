import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Space } from '../../spaces/entities/space.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Space, (space) => space.reservations, { eager: true })
  @JoinColumn({ name: 'spaceId' })
  space!: Space;

  @Column()
  spaceId!: string;

  @ManyToOne(() => Sport, { eager: true })
  @JoinColumn({ name: 'sportId' })
  sport!: Sport;

  @Column()
  sportId!: string;

  /** ISO date string, e.g. "2025-06-15" */
  @Column()
  date!: string;

  /** 24-hour time string, e.g. "09:00" */
  @Column()
  startTime!: string;

  /** 24-hour time string, e.g. "11:00" */
  @Column()
  endTime!: string;

  @Column()
  numPeople!: number;

  /** Tarifa por hora por persona (copiada del espacio al momento de crear) */
  @Column({ type: 'float', default: 0 })
  unitPrice!: number;

  /** Valor total = unitPrice * duración_en_horas * numPeople */
  @Column({ type: 'float', default: 0 })
  totalValue!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING_PAYMENT,
  })
  status!: ReservationStatus;

  /** Reference ID from the payment provider (mock) */
  @Column({ nullable: true, type: 'text' })
  paymentReference!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
