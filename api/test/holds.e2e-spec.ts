import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

// Every fan in this file starts with this prefix, so cleanup can find them.
const prefix = `h${Date.now()}`;
const fan = (name: string) => `${prefix}_${name}`;

describe('holds API (real database)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let url: string;
  const createdEventIds: number[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0); // a real port, so many requests can run at once
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

  const oneZone = [
    { name: 'All', fromRow: 'A', toRow: 'C', priceAgorot: 10000 },
  ];

  // A new event for each test: rows A to C, 6 seats per row by default.
  async function createEvent(
    dropAt = '2020-01-01T10:00:00Z',
    seatsPerRow = 6,
    zones = oneZone,
  ) {
    const response = await request(url)
      .post('/events')
      .send({
        name: 'Hold Test',
        venue: 'Test Hall',
        startsAt: '2030-07-01T20:00:00Z',
        dropAt,
        rowCount: 3,
        seatsPerRow,
        zones,
      })
      .expect(201);
    createdEventIds.push(response.body.event.id);
    return response.body.event.id as number;
  }

  function hold(eventId: number, username: string, seats: string[]) {
    return request(url)
      .post(`/events/${eventId}/holds`)
      .set('X-Username', username)
      .send({ seats });
  }

  async function viewEvent(eventId: number, username?: string) {
    const call = request(url).get(`/events/${eventId}`);
    const response = await (username ? call.set('X-Username', username) : call);
    return response.body;
  }

  function statusOf(event: { seats: { label: string; status: string }[] }) {
    return (label: string) =>
      event.seats.find((seat) => seat.label === label)?.status;
  }

  it('holds seats and shows them as held, with the fan hold list', async () => {
    const eventId = await createEvent();

    const response = await hold(eventId, fan('dana'), ['A1', 'A2']).expect(201);
    const event = await viewEvent(eventId, fan('dana'));

    expect(response.body.seats).toEqual(['A1', 'A2']);
    expect(statusOf(event)('A1')).toBe('held');
    expect(statusOf(event)('A3')).toBe('available');
    expect(event.myHolds).toHaveLength(1);
    expect(event.myHolds[0].seats).toEqual(['A1', 'A2']);
  });

  it('is all or nothing: one taken seat means nothing is held', async () => {
    const eventId = await createEvent();
    await hold(eventId, fan('dana'), ['A3']).expect(201);

    const response = await hold(eventId, fan('yossi'), ['A3', 'A4']).expect(
      409,
    );
    const event = await viewEvent(eventId);

    expect(response.body.message).toBe('Someone just took A3');
    expect(statusOf(event)('A4')).toBe('available');
  });

  it('rejects holds before the drop time', async () => {
    const eventId = await createEvent('2030-06-01T10:00:00Z');

    const response = await hold(eventId, fan('dana'), ['A1']).expect(403);

    expect(response.body.message).toBe('Tickets are not on sale yet');
  });

  it('rejects a seat that does not exist', async () => {
    const eventId = await createEvent();

    const response = await hold(eventId, fan('dana'), ['Z9']).expect(400);

    expect(response.body.message).toBe("Seat Z9 doesn't exist");
  });

  it('rejects a hold without the X-Username header', async () => {
    const eventId = await createEvent();

    await request(url)
      .post(`/events/${eventId}/holds`)
      .send({ seats: ['A1'] })
      .expect(401);
  });

  it('keeps a fan within the limit across several holds', async () => {
    const eventId = await createEvent();
    await hold(eventId, fan('dana'), ['A1', 'A2', 'A3']).expect(201);

    await hold(eventId, fan('dana'), ['B1', 'B2']).expect(409);
    await hold(eventId, fan('dana'), ['B1']).expect(201);
  });

  it('keeps the limit when one fan sends many holds at once', async () => {
    const eventId = await createEvent();
    // Seats at the ends of rows, so no hold can leave a lone seat.
    const seats = ['A1', 'A6', 'B1', 'B6', 'C1', 'C6'];

    const responses = await Promise.all(
      seats.map((seat) => hold(eventId, fan('rush'), [seat])),
    );
    const won = responses.filter((response) => response.status === 201);

    expect(won).toHaveLength(4);
  });

  it('lets exactly one of 50 fans hold the same seat', async () => {
    const eventId = await createEvent();

    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, i) => hold(eventId, fan(`f${i}`), ['B3'])),
    );
    const statuses = responses.map((response) => response.status);

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(49);
  });

  it('lets the owner release a hold, and the seats are available again', async () => {
    const eventId = await createEvent();
    const { body } = await hold(eventId, fan('dana'), ['C1']).expect(201);

    await request(url)
      .delete(`/holds/${body.id}`)
      .set('X-Username', fan('dana'))
      .expect(200);

    expect(statusOf(await viewEvent(eventId))('C1')).toBe('available');
    await hold(eventId, fan('yossi'), ['C1']).expect(201);
  });

  it('lets only the owner release a hold', async () => {
    const eventId = await createEvent();
    const { body } = await hold(eventId, fan('dana'), ['C1']).expect(201);

    const response = await request(url)
      .delete(`/holds/${body.id}`)
      .set('X-Username', fan('yossi'))
      .expect(403);

    expect(response.body.message).toBe(
      'Only the fan who made this hold can release it',
    );
  });

  it('frees the seats of an expired hold, with no cleanup job', async () => {
    const eventId = await createEvent();
    const { body } = await hold(eventId, fan('dana'), ['C3']).expect(201);

    // Move the expiry time into the past, instead of waiting 5 minutes.
    await dataSource.query(
      "UPDATE holds SET expires_at = now() - interval '1 second' WHERE id = $1",
      [body.id],
    );

    expect(statusOf(await viewEvent(eventId))('C3')).toBe('available');
    await request(url)
      .delete(`/holds/${body.id}`)
      .set('X-Username', fan('dana'))
      .expect(409);
    await hold(eventId, fan('yossi'), ['C3']).expect(201);
  });

  it('rejects a hold that would leave a single seat alone', async () => {
    const eventId = await createEvent();

    const response = await hold(eventId, fan('dana'), ['A2']).expect(409);

    expect(response.body.message).toContain('That would leave A1 empty');
  });

  describe('best available', () => {
    // Front is row A, Back is rows B and C. 8 seats per row.
    const twoZones = [
      { name: 'Front', fromRow: 'A', toRow: 'A', priceAgorot: 20000 },
      { name: 'Back', fromRow: 'B', toRow: 'C', priceAgorot: 10000 },
    ];

    function bestAvailable(eventId: number, username: string, body: object) {
      return request(url)
        .post(`/events/${eventId}/holds/best-available`)
        .set('X-Username', username)
        .send(body);
    }

    it("solves the brief's example: row A full, B4 and B5 sold", async () => {
      const eventId = await createEvent(undefined, 8, twoZones);
      await hold(eventId, fan('a1'), ['A1', 'A2', 'A3', 'A4']).expect(201);
      await hold(eventId, fan('a2'), ['A5', 'A6', 'A7', 'A8']).expect(201);
      const sold = await hold(eventId, fan('b'), ['B4', 'B5']).expect(201);
      await request(url)
        .post(`/holds/${sold.body.id}/checkout`)
        .set('X-Username', fan('b'))
        .expect(200);

      const response = await bestAvailable(eventId, fan('dana'), {
        count: 2,
      }).expect(201);

      // Every pair in row B would leave a lone seat, so row C wins.
      expect(response.body.seats).toEqual(['C4', 'C5']);
    });

    it('applies the max price filter', async () => {
      const eventId = await createEvent(undefined, 8, twoZones);

      const response = await bestAvailable(eventId, fan('dana'), {
        count: 2,
        maxPriceAgorot: 10000,
      }).expect(201);

      expect(response.body.seats).toEqual(['B4', 'B5']);
    });

    it('applies the zone filter', async () => {
      const eventId = await createEvent(undefined, 8, twoZones);

      const response = await bestAvailable(eventId, fan('dana'), {
        count: 3,
        zone: 'Back',
      }).expect(201);

      expect(response.body.seats).toEqual(['B3', 'B4', 'B5']);
    });

    it('rejects the request when nothing fits', async () => {
      const eventId = await createEvent(undefined, 8, twoZones);

      await bestAvailable(eventId, fan('dana'), {
        count: 2,
        zone: 'Balcony',
      }).expect(409);
    });
  });
});
