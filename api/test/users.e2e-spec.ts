import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

// A unique name per run, so old test runs never get in the way.
const username = `fan_${Date.now()}`;
const rushName = `${username}_rush`;

describe('users API (real database)', () => {
  let app: INestApplication<App>;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0); // a real port, so many requests can run at once
    url = await app.getUrl();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.query('DELETE FROM users WHERE username = ANY($1)', [
      [username, rushName],
    ]);
    await app.close();
  });

  function login(name: string) {
    return request(url).post('/users/login').send({ username: name });
  }

  it('creates a new fan', async () => {
    const response = await login(username).expect(200);

    expect(response.body.username).toBe(username);
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it('returns the same fan when logging in again', async () => {
    const first = await login(username).expect(200);
    const second = await login(username).expect(200);

    expect(second.body.id).toBe(first.body.id);
  });

  it('creates one fan when the same new name logs in 10 times at once', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => login(rushName)),
    );
    const ids = new Set(responses.map((response) => response.body.id));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(ids.size).toBe(1);
  });

  it('rejects a username with spaces', async () => {
    const response = await login('dana cohen').expect(400);

    expect(String(response.body.message)).toContain(
      'username must be 1 to 30 English letters, numbers, _ or -',
    );
  });

  it('rejects an empty username', () => {
    return login('').expect(400);
  });
});
