import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity.js';
import { Seat } from './seat.entity.js';
import { Zone } from './zone.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Zone, Seat])],
})
export class EventsModule {}
