import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service.js';
import { HoldStatus } from './hold.entity.js';

@Injectable()
export class HoldsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createHold(eventId: number, username: string, labels: string[]) {
    const user = await this.usersService.findOrCreate(username);
    const holdSeconds = Number(this.config.get('HOLD_TTL_SECONDS') ?? 300);
    const maxSeats = Number(this.config.get('MAX_SEATS_PER_USER') ?? 4);

    // All or nothing: any error below undoes the whole transaction.
    return this.dataSource.transaction(async (manager) => {
      // Lock the event, so holds for it happen one at a time.
      const events: { onSale: boolean }[] = await manager.query(
        'SELECT drop_at <= now() AS "onSale" FROM events WHERE id = $1 FOR UPDATE',
        [eventId],
      );
      if (events.length === 0) {
        throw new NotFoundException(`Event ${eventId} was not found`);
      }

      // Check 1: the drop time has passed.
      if (!events[0].onSale) {
        throw new ForbiddenException('Tickets are not on sale yet');
      }

      // Check 2: every seat exists and is available.
      const seats: { id: number; label: string; taken: boolean }[] =
        await manager.query(
          `SELECT seats.id, seats.label,
                  COALESCE(holds.status = 'active' AND holds.expires_at > now(), false) AS taken
           FROM seats
           LEFT JOIN holds ON holds.id = seats.hold_id
           WHERE seats.event_id = $1 AND seats.label = ANY($2)`,
          [eventId, labels],
        );
      const missing = labels.find(
        (label) => !seats.some((seat) => seat.label === label),
      );
      if (missing) {
        throw new BadRequestException(`Seat ${missing} doesn't exist`);
      }
      const taken = seats.find((seat) => seat.taken);
      if (taken) {
        throw new ConflictException(`Someone just took ${taken.label}`);
      }

      // Check 3: the fan's held seats plus the new ones stay within the limit.
      // Stage 4 adds the fan's bought seats to this count.
      const counts: { heldSeats: number }[] = await manager.query(
        `SELECT COUNT(*)::int AS "heldSeats"
         FROM seats
         JOIN holds ON holds.id = seats.hold_id
         WHERE holds.event_id = $1 AND holds.user_id = $2
           AND holds.status = 'active' AND holds.expires_at > now()`,
        [eventId, user.id],
      );
      if (counts[0].heldSeats + labels.length > maxSeats) {
        throw new ConflictException(
          `You can have at most ${maxSeats} seats in this event`,
        );
      }

      // Create the hold, then link its seats to it.
      const holds: { id: number; expiresAt: Date }[] = await manager.query(
        `INSERT INTO holds (event_id, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(secs => $3))
         RETURNING id, expires_at AS "expiresAt"`,
        [eventId, user.id, holdSeconds],
      );
      await manager.query('UPDATE seats SET hold_id = $1 WHERE id = ANY($2)', [
        holds[0].id,
        seats.map((seat) => seat.id),
      ]);

      return { id: holds[0].id, seats: labels, expiresAt: holds[0].expiresAt };
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
}
