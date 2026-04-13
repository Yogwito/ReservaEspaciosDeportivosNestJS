import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  capacity: number;

  /** Sports that are allowed to be played in this space */
  @ManyToMany(() => Sport, (sport) => sport.spaces, { eager: true })
  @JoinTable({
    name: 'space_sports',
    joinColumn: { name: 'spaceId' },
    inverseJoinColumn: { name: 'sportId' },
  })
  allowedSports: Sport[];

  /** Tarifa por hora por persona */
  @Column({ type: 'float', default: 0 })
  hourlyRate: number;

  @OneToMany('Reservation', 'space')
  reservations: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
