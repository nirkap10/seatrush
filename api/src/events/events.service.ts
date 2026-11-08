import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto.js';
import { Event } from './event.entity.js';
import { buildSeats, findZoneProblem } from './seat-map.js';
import { Seat } from './seat.entity.js';
import { Zone } from './zone.entity.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
  ) {}

  async createEvent(dto: CreateEventDto) {
    const zoneProblem = findZoneProblem(dto.zones, dto.rowCount);
    if (zoneProblem) {
      throw new BadRequestException(zoneProblem);
    }

    const startsAt = new Date(dto.startsAt);
    const dropAt = new Date(dto.dropAt);
    if (dropAt > startsAt) {
      throw new BadRequestException(
        'The drop time cannot be after the show starts',
      );
    }

    // A transaction, so an event is never saved without its zones and seats.
    const eventId = await this.dataSource.transaction(async (manager) => {
      const event = await manager.save(Event, {
        name: dto.name,
        venue: dto.venue,
        startsAt,
        dropAt,
        rowCount: dto.rowCount,
        seatsPerRow: dto.seatsPerRow,
      });

      const savedZones = await manager.save(
        Zone,
        dto.zones.map((zone) => ({
          eventId: event.id,
          name: zone.name,
          fromRow: zone.fromRow,
          toRow: zone.toRow,
          priceAgorot: zone.priceAgorot,
        })),
      );
      const zoneIdByName = new Map(
        savedZones.map((zone) => [zone.name, zone.id]),
      );

      const newSeats = buildSeats(dto.zones, dto.rowCount, dto.seatsPerRow);
      await manager.insert(
        Seat,
        newSeats.map((seat) => ({
          eventId: event.id,
          zoneId: zoneIdByName.get(seat.zoneName),
          label: seat.label,
          rowLetter: seat.rowLetter,
          seatNumber: seat.seatNumber,
        })),
      );

      return event.id;
    });

    return this.getEvent(eventId);
  }

  listEvents(): Promise<Event[]> {
    return this.events.find({ order: { dropAt: 'ASC', id: 'ASC' } });
  }

  async getEvent(id: number) {
    const event = await this.events.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event ${id} was not found`);
    }

    const zones = await this.zones.find({
      where: { eventId: id },
      order: { fromRow: 'ASC' },
    });

    // Every seat is available until holds and orders exist (stages 3 and 4).
    const seats: unknown[] = await this.dataSource.query(
      `SELECT label,
              row_letter  AS "rowLetter",
              seat_number AS "seatNumber",
              zone_id     AS "zoneId",
              'available' AS status
       FROM seats
       WHERE event_id = $1
       ORDER BY row_letter, seat_number`,
      [id],
    );

    return { event, zones, seats };
  }
}
