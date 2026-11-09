import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { UsersService } from '../users/users.service.js';
import { newLoneSeat, pickBestBlock, Row } from './best-available.js';
import { BestAvailableDto } from './dto/best-available.dto.js';
import { HoldStatus } from './hold.entity.js';

// One seat of the event, as the hold checks need it.
interface SeatState {
  id: number;
  label: string;
  rowLetter: string;
  seatNumber: number;
  available: boolean; // not sold, and not in an active, unexpired hold
  passesFilters: boolean; // price and zone filters of best available
}

@Injectable()
export class HoldsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createHold(eventId: number, username: string, labels: string[]) {
    const user = await this.usersService.findOrCreate(username);

    // All or nothing: any error below undoes the whole transaction.
    return this.dataSource.transaction(async (manager) => {
      await this.lockEventOnSale(manager, eventId);
      const seats = await this.readSeats(manager, eventId);

      // Every seat exists and is available.
      const missing = labels.find(
        (label) => !seats.some((seat) => seat.label === label),
      );
      if (missing) {
        throw new BadRequestException(`Seat ${missing} doesn't exist`);
      }
      const chosen = seats.filter((seat) => labels.includes(seat.label));
      const taken = chosen.find((seat) => !seat.available);
      if (taken) {
        throw new ConflictException(`Someone just took ${taken.label}`);
      }

      // No new lone seat, in any row the hold touches.
      for (const row of toRows(seats)) {
        const numbers = chosen
          .filter((seat) => seat.rowLetter === row.letter)
          .map((seat) => seat.seatNumber);
        if (numbers.length === 0) {
          continue;
        }
        const lone = newLoneSeat(row.available, numbers);
        if (lone !== null) {
          throw new ConflictException(
            `That would leave ${row.letter}${lone} empty on its own. Please pick seats that don't leave a single seat alone.`,
          );
        }
      }

      return this.saveHold(manager, eventId, user.id, chosen);
    });
  }

  async holdBestAvailable(
    eventId: number,
    username: string,
    dto: BestAvailableDto,
  ) {
    const user = await this.usersService.findOrCreate(username);

    return this.dataSource.transaction(async (manager) => {
      await this.lockEventOnSale(manager, eventId);
      const seats = await this.readSeats(
        manager,
        eventId,
        dto.maxPriceAgorot ?? null,
        dto.zone ?? null,
      );

      const block = pickBestBlock(toRows(seats), dto.count);
      if (!block) {
        throw new ConflictException(
          `No ${dto.count} seats side by side are available for your choice`,
        );
      }
      const chosen = seats.filter(
        (seat) =>
          seat.rowLetter === block.rowLetter &&
          seat.seatNumber >= block.firstSeat &&
          seat.seatNumber < block.firstSeat + dto.count,
      );

      return this.saveHold(manager, eventId, user.id, chosen);
    });
  }

  async releaseHold(holdId: number, username: string) {
    const user = await this.usersService.findOrCreate(username);

    return this.dataSource.transaction(async (manager) => {
      // Lock the hold's event, the same key that holds and checkout use.
      const events: unknown[] = await manager.query(
        `SELECT id FROM events
         WHERE id = (SELECT event_id FROM holds WHERE id = $1)
         FOR UPDATE`,
        [holdId],
      );
      if (events.length === 0) {
        throw new NotFoundException(`Hold ${holdId} was not found`);
      }

      const holds: { userId: number; status: HoldStatus; expired: boolean }[] =
        await manager.query(
          `SELECT user_id AS "userId", status, expires_at <= now() AS expired
           FROM holds WHERE id = $1`,
          [holdId],
        );
      const hold = holds[0];
      if (hold.userId !== user.id) {
        throw new ForbiddenException(
          'Only the fan who made this hold can release it',
        );
      }
      if (hold.status === 'released') {
        throw new ConflictException('This hold was already released');
      }
      if (hold.status === 'converted') {
        throw new ConflictException('These seats were already bought');
      }
      if (hold.expired) {
        throw new ConflictException('This hold has already expired');
      }

      // The seats keep their hold_id. A released hold no longer counts,
      // so they're available again right away.
      await manager.query(
        "UPDATE holds SET status = 'released' WHERE id = $1",
        [holdId],
      );
      return { id: holdId, status: 'released' };
    });
  }

  // Locks the event, so changes to it happen one at a time,
  // and checks that the drop time has passed.
  private async lockEventOnSale(manager: EntityManager, eventId: number) {
    const events: { onSale: boolean }[] = await manager.query(
      'SELECT drop_at <= now() AS "onSale" FROM events WHERE id = $1 FOR UPDATE',
      [eventId],
    );
    if (events.length === 0) {
      throw new NotFoundException(`Event ${eventId} was not found`);
    }
    if (!events[0].onSale) {
      throw new ForbiddenException('Tickets are not on sale yet');
    }
  }

  // Every seat of the event, sorted by row and number.
  private readSeats(
    manager: EntityManager,
    eventId: number,
    maxPriceAgorot: number | null = null,
    zone: string | null = null,
  ): Promise<SeatState[]> {
    return manager.query(
      `SELECT seats.id, seats.label,
              seats.row_letter  AS "rowLetter",
              seats.seat_number AS "seatNumber",
              seats.order_id IS NULL AND NOT COALESCE(
                holds.status = 'active' AND holds.expires_at > now(), false
              ) AS available,
              ($2::int IS NULL OR zones.price_agorot <= $2)
                AND ($3::text IS NULL OR zones.name = $3) AS "passesFilters"
       FROM seats
       JOIN zones ON zones.id = seats.zone_id
       LEFT JOIN holds ON holds.id = seats.hold_id
       WHERE seats.event_id = $1
       ORDER BY seats.row_letter, seats.seat_number`,
      [eventId, maxPriceAgorot, zone],
    );
  }

  // Checks the per-fan limit, then creates the hold and links its seats.
  private async saveHold(
    manager: EntityManager,
    eventId: number,
    userId: number,
    seats: SeatState[],
  ) {
    const holdSeconds = Number(this.config.get('HOLD_TTL_SECONDS') ?? 300);
    const maxSeats = Number(this.config.get('MAX_SEATS_PER_USER') ?? 4);

    // Held and bought seats both count.
    const counts: { seatCount: number }[] = await manager.query(
      `SELECT COUNT(*)::int AS "seatCount"
       FROM seats
       LEFT JOIN holds ON holds.id = seats.hold_id
       LEFT JOIN orders ON orders.id = seats.order_id
       WHERE seats.event_id = $1
         AND (orders.user_id = $2
              OR (holds.user_id = $2 AND holds.status = 'active'
                  AND holds.expires_at > now()))`,
      [eventId, userId],
    );
    if (counts[0].seatCount + seats.length > maxSeats) {
      throw new ConflictException(
        `You can have at most ${maxSeats} seats in this event, including seats you bought`,
      );
    }

    const holds: { id: number; expiresAt: Date }[] = await manager.query(
      `INSERT INTO holds (event_id, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(secs => $3))
       RETURNING id, expires_at AS "expiresAt"`,
      [eventId, userId, holdSeconds],
    );
    await manager.query('UPDATE seats SET hold_id = $1 WHERE id = ANY($2)', [
      holds[0].id,
      seats.map((seat) => seat.id),
    ]);

    return {
      id: holds[0].id,
      seats: seats.map((seat) => seat.label),
      expiresAt: holds[0].expiresAt,
    };
  }
}

// Groups the sorted seats into rows, for the lone seat and best available checks.
function toRows(seats: SeatState[]): Row[] {
  const rows: Row[] = [];
  for (const seat of seats) {
    let row = rows.at(-1);
    if (row?.letter !== seat.rowLetter) {
      row = { letter: seat.rowLetter, available: [], usable: [] };
      rows.push(row);
    }
    row.available.push(seat.available);
    row.usable.push(seat.available && seat.passesFilters);
  }
  return rows;
}
