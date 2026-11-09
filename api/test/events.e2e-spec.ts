import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { DEMO_EVENT_NAME } from './../src/events/demo-event.service.js';

const validEvent = {
  name: 'Test Show',
  venue: 'Test Hall',
  startsAt: '2030-07-01T20:00:00Z',
  dropAt: '2030-06-01T10:00:00Z',
  rowCount: 3,
  seatsPerRow: 2,
  zones: [
    { name: 'Front', fromRow: 'A', toRow: 'A', priceAgorot: 20000 },
    { name: 'Back', fromRow: 'B', toRow: 'C', priceAgorot: 10000 },
  ],
};

describe('events API (real database)', () => {
  let app: INestApplication<App>;
  const createdEventIds: number[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  // Removes the events these tests created, so the database stays clean.
  afterAll(async () => {
    const dataSource = app.get(DataSource);
    const ids = [createdEventIds];
    await dataSource.query('DELETE FROM seats WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM zones WHERE event_id = ANY($1)', ids);
    await dataSource.query('DELETE FROM events WHERE id = ANY($1)', ids);
    await app.close();
  });

  async function createEvent() {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send(validEvent)
      .expect(201);
    createdEventIds.push(response.body.event.id);
    return response.body;
  }

  function expectRejected(event: object, message: string) {
    return request(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(400)
      .expect((response) => {
        expect(String(response.body.message)).toContain(message);
      });
  }

  describe('POST /events', () => {
    it('creates the event with its zones and every seat', async () => {
      const { event, zones, seats } = await createEvent();

      expect(event.name).toBe('Test Show');
      expect(zones).toHaveLength(2);
      expect(seats.map((seat: { label: string }) => seat.label)).toEqual([
        'A1',
        'A2',
        'B1',
        'B2',
        'C1',
        'C2',
      ]);
    });

    it('puts each seat in the zone that covers its row', async () => {
      const { zones, seats } = await createEvent();
      const back = zones.find((zone: { name: string }) => zone.name === 'Back');
      const c2 = seats.find((seat: { label: string }) => seat.label === 'C2');

      expect(c2.zoneId).toBe(back.id);
      expect(c2.status).toBe('available');
    });

    it('rejects a row with no zone', () => {
      return expectRejected(
        { ...validEvent, rowCount: 4 },
        'Row D has no zone',
      );
    });

    it('rejects a drop time after the show starts', () => {
      return expectRejected(
        { ...validEvent, dropAt: '2031-01-01T10:00:00Z' },
        'The drop time cannot be after the show starts',
      );
    });

    it('rejects more than 26 rows', () => {
      return expectRejected(
        { ...validEvent, rowCount: 27 },
        'rowCount must not be greater than 26',
      );
    });

    it('rejects more than 100 seats per row', () => {
      return expectRejected(
        { ...validEvent, seatsPerRow: 101 },
        'seatsPerRow must not be greater than 100',
      );
    });

    it('rejects a missing name', () => {
      const { name: _name, ...withoutName } = validEvent;
      return expectRejected(withoutName, 'name');
    });
  });

  describe('GET /events', () => {
    it('lists events without their seats', async () => {
      const { event } = await createEvent();

      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);
      const listed = response.body.find(
        (item: { id: number }) => item.id === event.id,
      );

      expect(listed.name).toBe('Test Show');
      expect(listed.seats).toBeUndefined();
    });
  });

  describe('GET /events/:id', () => {
    it('returns the event with its zones and seats', async () => {
      const { event } = await createEvent();

      const response = await request(app.getHttpServer())
        .get(`/events/${event.id}`)
        .expect(200);

      expect(response.body.event.name).toBe('Test Show');
      expect(response.body.zones).toHaveLength(2);
      expect(response.body.seats).toHaveLength(6);
    });

    it('returns 404 for an event that does not exist', () => {
      return request(app.getHttpServer())
        .get('/events/2147483647')
        .expect(404)
        .expect((response) => {
          expect(response.body.message).toBe('Event 2147483647 was not found');
        });
    });

    it('returns 400 when the id is not a number', () => {
      return request(app.getHttpServer()).get('/events/abc').expect(400);
    });
  });

  describe('demo event', () => {
    it('exists and is already on sale', async () => {
      const response = await request(app.getHttpServer())
        .get('/events')
        .expect(200);
      const demo = response.body.find(
        (event: { name: string }) => event.name === DEMO_EVENT_NAME,
      );

      expect(demo).toBeDefined();
      expect(new Date(demo.dropAt).getTime()).toBeLessThan(Date.now());
    });
  });
});
