import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { HoldStatus } from '../holds/hold.entity.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  async checkout(holdId: number, username: string) {
    const user = await this.usersService.findOrCreate(username);

    return this.dataSource.transaction(async (manager) => {
      // Lock the hold's event, the same key that holds and release use.
      const events: unknown[] = await manager.query(
        `SELECT id FROM events
         WHERE id = (SELECT event_id FROM holds WHERE id = $1)
         FOR UPDATE`,
        [holdId],
      );
      if (events.length === 0) {
        throw new NotFoundException(`Hold ${holdId} was not found`);
      }

      const holds: {
        userId: number;
        eventId: number;
        status: HoldStatus;
        expired: boolean;
      }[] = await manager.query(
        `SELECT user_id AS "userId", event_id AS "eventId", status,
                expires_at <= now() AS expired
         FROM holds WHERE id = $1`,
        [holdId],
      );
      const hold = holds[0];
      if (hold.userId !== user.id) {
        throw new ForbiddenException(
          'Only the fan who made this hold can check out',
        );
      }

      // One order per hold: checking out again returns the same order.
      if (hold.status === 'converted') {
        const [existing] = await this.readOrders(
          manager,
          'orders.hold_id = $1',
          holdId,
        );
        return existing;
      }
      if (hold.status === 'released') {
        throw new ConflictException('This hold was released');
      }
      // From the moment of expiry, even if nothing has cleaned it up.
      if (hold.expired) {
        throw new ConflictException(
          'Your hold expired, so its seats went back on sale',
        );
      }

      const totals: { total: number }[] = await manager.query(
        `SELECT SUM(zones.price_agorot)::int AS total
         FROM seats JOIN zones ON zones.id = seats.zone_id
         WHERE seats.hold_id = $1`,
        [holdId],
      );
      const orders: { id: number }[] = await manager.query(
        `INSERT INTO orders (hold_id, user_id, event_id, total_agorot)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [holdId, user.id, hold.eventId, totals[0].total],
      );
      await manager.query('UPDATE seats SET order_id = $1 WHERE hold_id = $2', [
        orders[0].id,
        holdId,
      ]);
      await manager.query(
        "UPDATE holds SET status = 'converted' WHERE id = $1",
        [holdId],
      );

      const [order] = await this.readOrders(
        manager,
        'orders.id = $1',
        orders[0].id,
      );
      return order;
    });
  }

  // My tickets: every order of the fan, newest first.
  async myOrders(username: string) {
    const user = await this.usersService.find(username);
    if (!user) {
      return [];
    }
    return this.readOrders(
      this.dataSource.manager,
      'orders.user_id = $1',
      user.id,
    );
  }

  // `where` is always written in this file, never taken from a request.
  private readOrders(
    manager: EntityManager,
    where: string,
    value: number,
  ): Promise<unknown[]> {
    return manager.query(
      `SELECT orders.id,
              orders.hold_id      AS "holdId",
              orders.event_id     AS "eventId",
              events.name         AS "eventName",
              events.venue,
              events.starts_at    AS "startsAt",
              orders.total_agorot AS "totalAgorot",
              orders.created_at   AS "createdAt",
              array_agg(seats.label ORDER BY seats.row_letter, seats.seat_number) AS seats
       FROM orders
       JOIN events ON events.id = orders.event_id
       JOIN seats ON seats.order_id = orders.id
       WHERE ${where}
       GROUP BY orders.id, events.id
       ORDER BY orders.created_at DESC, orders.id DESC`,
      [value],
    );
  }
}
