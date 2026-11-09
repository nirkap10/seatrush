import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

// Every fan in this file starts with this prefix, so cleanup can find them.
const prefix = `o${Date.now()}`;
const fan = (name: string) => `${prefix}_${name}`;

describe('checkout and my tickets (real database)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let url: string;
  const createdEventIds: number[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    url = await app.getUrl();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    const ids = [createdEventIds];
    await dataSource.query('DELETE FROM seats WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM orders WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM holds WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM zones WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM events WHERE id = ANY($1)', ids);
    await dataSource.query('DELETE FROM users WHERE username LIKE $1', [
      `${prefix}%`,
    ]);
    await app.close();
  });

  // Row A costs 200.00 ILS, rows B and C cost 100.00 ILS. 6 seats per row.
  async function createEvent() {
    const response = await request(url)
      .post('/events')
      .send({
        name: 'Checkout Test',
        venue: 'Test Hall',
        startsAt: '2030-07-01T20:00:00Z',
        dropAt: '2020-01-01T10:00:00Z',
        rowCount: 3,
        seatsPerRow: 6,
        zones: [
          { name: 'Front', fromRow: 'A', toRow: 'A', priceAgorot: 20000 },
          { name: 'Back', fromRow: 'B', toRow: 'C', priceAgorot: 10000 },
        ],
      })
      .expect(201);
    createdEventIds.push(response.body.event.id);
    return response.body.event.id as number;
  }

  async function hold(eventId: number, username: string, seats: string[]) {
    const response = await request(url)
      .post(`/events/${eventId}/holds`)
      .set('X-Username', username)
      .send({ seats })
      .expect(201);
    return response.body.id as number;
  }

  function checkout(holdId: number, username: string, promoCode?: string) {
    return request(url)
      .post(`/holds/${holdId}/checkout`)
      .set('X-Username', username)
      .send(promoCode ? { promoCode } : {});
  }

  it('creates an order and the seats become sold', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1', 'B1']);

    const response = await checkout(holdId, fan('dana')).expect(200);
    const event = await request(url).get(`/events/${eventId}`);
    const statusOf = (label: string) =>
      event.body.seats.find((seat: { label: string }) => seat.label === label)
        .status;

    expect(response.body.totalAgorot).toBe(30000);
    expect(response.body.seats).toEqual(['A1', 'B1']);
    expect(statusOf('A1')).toBe('sold');
    expect(statusOf('B1')).toBe('sold');
  });

  it('returns the same order when checking out again', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1']);

    const first = await checkout(holdId, fan('dana')).expect(200);
    const second = await checkout(holdId, fan('dana')).expect(200);

    expect(second.body.id).toBe(first.body.id);
  });

  it('lets only the fan who holds the seats check out', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1']);

    await checkout(holdId, fan('yossi')).expect(403);
  });

  it('fails from the moment the hold expires', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1']);
    await dataSource.query(
      "UPDATE holds SET expires_at = now() - interval '1 second' WHERE id = $1",
      [holdId],
    );

    const response = await checkout(holdId, fan('dana')).expect(409);

    expect(response.body.message).toBe(
      'Your hold expired, so its seats went back on sale',
    );
  });

  it('fails for a released hold', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1']);
    await request(url)
      .delete(`/holds/${holdId}`)
      .set('X-Username', fan('dana'))
      .expect(200);

    await checkout(holdId, fan('dana')).expect(409);
  });

  it('counts bought seats toward the per-fan limit', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['B1', 'B2', 'B3']);
    await checkout(holdId, fan('dana')).expect(200);

    await request(url)
      .post(`/events/${eventId}/holds`)
      .set('X-Username', fan('dana'))
      .send({ seats: ['C1', 'C2'] })
      .expect(409);
    await hold(eventId, fan('dana'), ['C1']);
  });

  it('lists my tickets, newest first', async () => {
    const eventId = await createEvent();
    await checkout(await hold(eventId, fan('tickets'), ['A1']), fan('tickets'));
    await checkout(await hold(eventId, fan('tickets'), ['C6']), fan('tickets'));

    const response = await request(url)
      .get('/me/orders')
      .set('X-Username', fan('tickets'))
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].seats).toEqual(['C6']);
    expect(response.body[0].eventName).toBe('Checkout Test');
  });

  it('SAVE10 takes 10% off, and works on every order', async () => {
    const eventId = await createEvent();
    // 200.00 + 100.00 = 300.00, minus 30.00
    const first = await checkout(
      await hold(eventId, fan('save'), ['A1', 'B1']),
      fan('save'),
      'SAVE10',
    ).expect(200);
    const second = await checkout(
      await hold(eventId, fan('save'), ['C1']),
      fan('save'),
      'SAVE10',
    ).expect(200);

    expect(first.body.totalAgorot).toBe(27000);
    expect(first.body.discountAgorot).toBe(3000);
    expect(first.body.promoCode).toBe('SAVE10');
    expect(second.body.totalAgorot).toBe(9000);
  });

  it('WELCOME20 takes 20.00 off, once per fan ever', async () => {
    const eventId = await createEvent();
    const first = await checkout(
      await hold(eventId, fan('welcome'), ['B1']),
      fan('welcome'),
      'WELCOME20',
    ).expect(200);
    const secondHold = await hold(eventId, fan('welcome'), ['B2']);
    const reused = await checkout(secondHold, fan('welcome'), 'WELCOME20');

    expect(first.body.totalAgorot).toBe(8000);
    expect(reused.status).toBe(400);
    expect(reused.body.message).toBe('You already used WELCOME20');
    // The rejected code changed nothing: the fan can still buy without it.
    await checkout(secondHold, fan('welcome')).expect(200);
  });

  it('checking out again with WELCOME20 returns the same order', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('again'), ['B1']);

    const first = await checkout(holdId, fan('again'), 'WELCOME20').expect(200);
    const second = await checkout(holdId, fan('again'), 'WELCOME20').expect(
      200,
    );

    expect(second.body.id).toBe(first.body.id);
  });

  it('uses up WELCOME20 only when an order is created', async () => {
    const eventId = await createEvent();
    const expired = await hold(eventId, fan('later'), ['B1']);
    await dataSource.query(
      "UPDATE holds SET expires_at = now() - interval '1 second' WHERE id = $1",
      [expired],
    );
    await checkout(expired, fan('later'), 'WELCOME20').expect(409);

    const holdId = await hold(eventId, fan('later'), ['B3']);
    await checkout(holdId, fan('later'), 'WELCOME20').expect(200);
  });

  it('lets only one of two checkouts at once use WELCOME20', async () => {
    const eventId = await createEvent();
    const holdA = await hold(eventId, fan('race'), ['B1']);
    const holdB = await hold(eventId, fan('race'), ['B2']);

    const results = await Promise.all([
      checkout(holdA, fan('race'), 'WELCOME20'),
      checkout(holdB, fan('race'), 'WELCOME20'),
    ]);

    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 400,
    ]);
  });

  it('rejects an unknown promo code', async () => {
    const eventId = await createEvent();
    const holdId = await hold(eventId, fan('dana'), ['A1']);

    const response = await checkout(holdId, fan('dana'), 'FREE').expect(400);

    expect(response.body.message).toBe('FREE is not a promo code we know');
  });
});
