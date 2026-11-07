import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity.js';
import { EventsService } from './events.service.js';

export const DEMO_EVENT_NAME = 'SeatRush Demo Show';

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * ONE_HOUR_MS;

@Injectable()
export class DemoEventService implements OnApplicationBootstrap {
  constructor(
    private readonly eventsService: EventsService,
    @InjectRepository(Event) private readonly events: Repository<Event>,
  ) {}

  // NestJS calls this once when the app starts, after the migrations have run.
  async onApplicationBootstrap(): Promise<void> {
    if (await this.events.existsBy({ name: DEMO_EVENT_NAME })) {
      return;
    }

    await this.eventsService.createEvent({
      name: DEMO_EVENT_NAME,
      venue: 'Tel Aviv Arena',
      startsAt: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
      dropAt: new Date(Date.now() - ONE_HOUR_MS).toISOString(),
      rowCount: 8,
      seatsPerRow: 10,
      zones: [
        { name: 'Front', fromRow: 'A', toRow: 'B', priceAgorot: 34935 },
        { name: 'Middle', fromRow: 'C', toRow: 'E', priceAgorot: 24900 },
        { name: 'Back', fromRow: 'F', toRow: 'H', priceAgorot: 14900 },
      ],
    });
  }
}
