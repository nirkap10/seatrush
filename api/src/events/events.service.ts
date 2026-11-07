import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventDetailsDto, EventSummaryDto } from './dto/event-response.dto.js';
import { Event } from './event.entity.js';
import { buildSeats, findZoneProblem } from './seat-map.js';
import { Seat } from './seat.entity.js';
import { Zone } from './zone.entity.js';

const POSTGRES_MAX_INT = 2_147_483_647;

@Injectable()
export class EventsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
  ) {}

  async createEvent(dto: CreateEventDto): Promise<EventDetailsDto> {
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

  async listEvents(): Promise<EventSummaryDto[]> {
    const events = await this.events.find({
      order: { dropAt: 'ASC', id: 'ASC' },
    });
    return events.map((event) => this.toSummary(event));
  }

  async getEvent(id: number): Promise<EventDetailsDto> {
    // A larger number can't be an id, and PostgreSQL would reject it with an error.
    const event =
      id <= POSTGRES_MAX_INT ? await this.events.findOneBy({ id }) : null;
    if (!event) {
      throw new NotFoundException(`Event ${id} was not found`);
    }

    const zones = await this.zones.find({
      where: { eventId: id },
      order: { fromRow: 'ASC' },
    });
    const seats = await this.seats.find({
      where: { eventId: id },
      order: { rowLetter: 'ASC', seatNumber: 'ASC' },
    });

    return {
      ...this.toSummary(event),
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        fromRow: zone.fromRow,
        toRow: zone.toRow,
        priceAgorot: zone.priceAgorot,
      })),
      seats: seats.map((seat) => ({
        label: seat.label,
        rowLetter: seat.rowLetter,
        seatNumber: seat.seatNumber,
        zoneId: seat.zoneId,
        // Holds and orders arrive in stages 3 and 4, and will change this.
        status: 'available',
      })),
    };
  }

  private toSummary(event: Event) {
    return {
      id: event.id,
      name: event.name,
      venue: event.venue,
      startsAt: event.startsAt,
      dropAt: event.dropAt,
      rowCount: event.rowCount,
      seatsPerRow: event.seatsPerRow,
    };
  }
}
