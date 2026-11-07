import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoEventService } from './demo-event.service.js';
import { Event } from './event.entity.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Seat } from './seat.entity.js';
import { Zone } from './zone.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Zone, Seat])],
  controllers: [EventsController],
  providers: [EventsService, DemoEventService],
})
export class EventsModule {}
