import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Exclude()
  @Column()
  password!: string;

  @Column({ default: UserRole.USER })
  role!: UserRole;

  @Exclude()
  @Column({ nullable: true, type: 'text' })
  twoFactorSecret!: string | null;

  @Column({ default: false })
  isTwoFactorEnabled!: boolean;

  /** True después del primer login con 2FA exitoso — omite 2FA en logins siguientes */
  @Column({ default: false })
  firstLoginDone!: boolean;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ nullable: true, type: 'text' })
  emailVerificationCode!: string | null;

  @Column({ nullable: true, type: 'bigint' })
  emailVerificationExpiry!: number | null;

  // Circular ref resolved lazily — import as string to avoid circular deps
  @OneToMany('Reservation', 'user')
  reservations!: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}