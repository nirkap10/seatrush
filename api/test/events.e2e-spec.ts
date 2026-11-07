import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { DEMO_EVENT_NAME } from './../src/events/demo-event.service.js';
import { setupSwagger } from './../src/swagger.js';

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
    setupSwagger(app);
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
    createdEventIds.push(response.body.id);
    return response.body;
  }

  function expectRejected(event: object, status: number, message: string) {
    return request(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(status)
      .expect((response) => {
        expect(String(response.body.message)).toContain(message);
      });
  }

  describe('POST /events', () => {
    it('creates the event with its zones and every seat', async () => {
      const event = await createEvent();

      expect(event.name).toBe('Test Show');
      expect(event.zones).toHaveLength(2);
      expect(event.seats.map((seat: { label: string }) => seat.label)).toEqual([
        'A1',
        'A2',
        'B1',
        'B2',
        'C1',
        'C2',
      ]);
    });

    it('puts each seat in the zone that covers its row', async () => {
      const event = await createEvent();
      const back = event.zones.find(
        (zone: { name: string }) => zone.name === 'Back',
      );
      const c2 = event.seats.find(
        (seat: { label: string }) => seat.label === 'C2',
      );

      expect(c2.zoneId).toBe(back.id);
      expect(c2.status).toBe('available');
    });

    it('rejects a row with no zone', () => {
      return expectRejected(
        { ...validEvent, rowCount: 4 },
        400,
        'Row D has no zone',
      );
    });

    it('rejects a drop time after the show starts', () => {
      return expectRejected(
        { ...validEvent, dropAt: '2031-01-01T10:00:00Z' },
        400,
        'The drop time cannot be after the show starts',
      );
    });

    it('rejects a missing name', () => {
      const { name: _name, ...withoutName } = validEvent;
      return expectRejected(withoutName, 400, 'name');
    });

    it('rejects more than 26 rows', () => {
      return expectRejected({ ...validEvent, rowCount: 27 }, 400, 'rowCount');
    });

    it('checks the fields inside each zone', () => {
      return expectRejected(
        {
          ...validEvent,
          zones: [{ name: 'Front', fromRow: 'a', toRow: 'C', priceAgorot: 1 }],
        },
        400,
        'fromRow must be one capital letter',
      );
    });
  });

  describe('GET /events', () => {
    it('lists events without their seats', async () => {
      const event = await createEvent();

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
      const event = await createEvent();

      const response = await request(app.getHttpServer())
        .get(`/events/${event.id}`)
        .expect(200);

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

    it('returns 404 for a number too large to be an id', () => {
      return request(app.getHttpServer())
        .get('/events/99999999999')
        .expect(404);
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

  describe('API docs', () => {
    it('serves the interactive page', () => {
      return request(app.getHttpServer()).get('/docs').expect(200);
    });

    it('describes every event endpoint and its errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);
      const paths = response.body.paths;

      expect(paths['/events'].post.responses).toHaveProperty('201');
      expect(paths['/events'].post.responses).toHaveProperty('400');
      expect(paths['/events'].get.responses).toHaveProperty('200');
      expect(paths['/events/{id}'].get.responses).toHaveProperty('404');
    });
  });
});
