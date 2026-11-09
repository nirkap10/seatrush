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

  function checkout(holdId: number, username: string) {
    return request(url)
      .post(`/holds/${holdId}/checkout`)
      .set('X-Username', username);
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
});
