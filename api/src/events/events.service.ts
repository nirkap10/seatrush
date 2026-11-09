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
import { UsersService } from '../users/users.service.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    private readonly usersService: UsersService,
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

  async getEvent(id: number, username?: string) {
    const event = await this.events.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event ${id} was not found`);
    }

    const zones = await this.zones.find({
      where: { eventId: id },
      order: { fromRow: 'ASC' },
    });

    // A seat is held while its latest hold is active and not expired.
    // Sold seats come with orders (stage 4).
    const seats: unknown[] = await this.dataSource.query(
      `SELECT seats.label,
              seats.row_letter  AS "rowLetter",
              seats.seat_number AS "seatNumber",
              seats.zone_id     AS "zoneId",
              CASE WHEN holds.status = 'active' AND holds.expires_at > now()
                   THEN 'held' ELSE 'available' END AS status
       FROM seats
       LEFT JOIN holds ON holds.id = seats.hold_id
       WHERE seats.event_id = $1
       ORDER BY seats.row_letter, seats.seat_number`,
      [id],
    );

    const user = username ? await this.usersService.find(username) : null;
    const myHolds: unknown[] = user
      ? await this.dataSource.query(
          `SELECT holds.id,
                  holds.expires_at AS "expiresAt",
                  array_agg(seats.label ORDER BY seats.row_letter, seats.seat_number) AS seats
           FROM holds
           JOIN seats ON seats.hold_id = holds.id
           WHERE holds.event_id = $1 AND holds.user_id = $2
             AND holds.status = 'active' AND holds.expires_at > now()
           GROUP BY holds.id
           ORDER BY holds.id`,
          [id, user.id],
        )
      : [];

    // The screens count down by the server's clock, not the browser's.
    const [{ serverTime }]: { serverTime: Date }[] =
      await this.dataSource.query('SELECT now() AS "serverTime"');

    return { event, zones, seats, myHolds, serverTime };
  }
}
