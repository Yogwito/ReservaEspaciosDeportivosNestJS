import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface TimeSlot {
  /** 24-hour format, e.g. "08:00" */
  start: string;
  /** 24-hour format, e.g. "10:00" */
  end: string;
}

@Entity('sports')
export class Sport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  /**
   * Stored as JSON array of { start: "HH:MM", end: "HH:MM" } objects.
   * A reservation's time window must be fully contained within one slot.
   */
  @Column({ type: 'simple-json' })
  allowedTimeSlots!: TimeSlot[];

  // Back-reference to spaces that allow this sport
  @ManyToMany('Space', 'allowedSports')
  spaces!: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}