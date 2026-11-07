import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CreateEventsZonesSeats1794009600000 } from './database/migrations/1794009600000-create-events-zones-seats.js';
import { EventsModule } from './events/events.module.js';

const LOCAL_DATABASE_URL =
  'postgres://seatrush:seatrush@localhost:5432/seatrush';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', LOCAL_DATABASE_URL),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [CreateEventsZonesSeats1794009600000],
        migrationsRun: true,
      }),
    }),
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
