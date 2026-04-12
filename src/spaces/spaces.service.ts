import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { Space } from './entities/space.entity';
import { Sport } from '../sports/entities/sport.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    @InjectRepository(Sport)
    private readonly sportsRepository: Repository<Sport>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
  ) {}

  async create(dto: CreateSpaceDto): Promise<Space> {
    const sports = dto.allowedSportIds?.length
      ? await this.sportsRepository.findBy({ id: In(dto.allowedSportIds) })
      : [];

    const space = this.spacesRepository.create({
      name: dto.name,
      location: dto.location,
      capacity: dto.capacity,
      hourlyRate: dto.hourlyRate,
      allowedSports: sports,
    });
    return this.spacesRepository.save(space);
  }

  findAll(): Promise<Space[]> {
    return this.spacesRepository.find({ relations: ['allowedSports'] });
  }

  async findOne(id: string): Promise<Space> {
    const space = await this.spacesRepository.findOne({
      where: { id },
      relations: ['allowedSports'],
    });
    if (!space) throw new NotFoundException(`Space ${id} not found`);
    return space;
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findOne(id);
    const patch = dto as Partial<{
      name: string;
      location: string;
      capacity: number;
      allowedSportIds: string[];
    }>;

    if (patch.allowedSportIds !== undefined) {
      space.allowedSports = patch.allowedSportIds.length
        ? await this.sportsRepository.findBy({ id: In(patch.allowedSportIds) })
        : [];
    }

    const { allowedSportIds: _, ...rest } = patch;
    Object.assign(space, rest);
    return this.spacesRepository.save(space);
  }

  async remove(id: string): Promise<void> {
    const space = await this.findOne(id);
    await this.spacesRepository.remove(space);
  }

  /** Cuenta las reservas que no están canceladas para un espacio */
  async getTotalReservations(spaceId: string): Promise<number> {
    return this.reservationsRepository.count({
      where: {
        spaceId,
        status: Not(ReservationStatus.CANCELLED),
      },
    });
  }
}
