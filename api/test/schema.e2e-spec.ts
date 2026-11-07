import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { AppModule } from './../src/app.module.js';

// Each test runs inside a transaction that is rolled back, so it leaves no data.
describe('database schema (real database)', () => {
  let app: INestApplication;
  let db: QueryRunner;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    db = app.get(DataSource).createQueryRunner();
    await db.startTransaction();
  });

  afterEach(async () => {
    await db.rollbackTransaction();
    await db.release();
  });

  afterAll(async () => {
    await app.close();
  });

  async function insertEvent(rowCount = 2): Promise<number> {
    const rows: { id: number }[] = await db.query(
      `INSERT INTO events (name, venue, starts_at, drop_at, row_count, seats_per_row)
       VALUES ('Show', 'Hall', now(), now(), $1, 8)
       RETURNING id`,
      [rowCount],
    );
    return rows[0].id;
  }

  async function insertZone(
    eventId: number,
    name = 'Front',
    fromRow = 'A',
    toRow = 'B',
    price = 10000,
  ): Promise<number> {
    const rows: { id: number }[] = await db.query(
      `INSERT INTO zones (event_id, name, from_row, to_row, price_agorot)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [eventId, name, fromRow, toRow, price],
    );
    return rows[0].id;
  }

  function insertSeat(eventId: number, zoneId: number, label = 'B7') {
    return db.query(
      `INSERT INTO seats (event_id, zone_id, label, row_letter, seat_number)
       VALUES ($1, $2, $3, 'B', 7)`,
      [eventId, zoneId, label],
    );
  }

  it('rejects a second B7 in the same event', async () => {
    const eventId = await insertEvent();
    const zoneId = await insertZone(eventId);
    await insertSeat(eventId, zoneId);

    await expect(insertSeat(eventId, zoneId)).rejects.toThrow(
      'seats_event_label_unique',
    );
  });

  it('allows B7 in two different events', async () => {
    const firstEventId = await insertEvent();
    const secondEventId = await insertEvent();
    await insertSeat(firstEventId, await insertZone(firstEventId));

    await expect(
      insertSeat(secondEventId, await insertZone(secondEventId)),
    ).resolves.toBeDefined();
  });

  it('rejects two zones with the same name in an event', async () => {
    const eventId = await insertEvent();
    await insertZone(eventId, 'Front');

    await expect(insertZone(eventId, 'Front')).rejects.toThrow(
      'zones_event_name_unique',
    );
  });

  it('rejects a seat that points to a zone that does not exist', async () => {
    const eventId = await insertEvent();

    await expect(insertSeat(eventId, 999999)).rejects.toThrow(
      'seats_zone_id_fkey',
    );
  });

  it('rejects a zone whose rows are in the wrong order', async () => {
    const eventId = await insertEvent();

    await expect(insertZone(eventId, 'Front', 'C', 'A')).rejects.toThrow(
      'zones_row_order',
    );
  });

  it('rejects a negative price', async () => {
    const eventId = await insertEvent();

    await expect(insertZone(eventId, 'Front', 'A', 'B', -1)).rejects.toThrow(
      'zones_price_not_negative',
    );
  });

  it('rejects more than 26 rows', async () => {
    await expect(insertEvent(27)).rejects.toThrow('events_row_count_range');
  });
});
