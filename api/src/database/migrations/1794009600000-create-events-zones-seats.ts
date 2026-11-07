import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsZonesSeats1794009600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE events (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        venue         TEXT NOT NULL,
        starts_at     TIMESTAMPTZ NOT NULL,
        drop_at       TIMESTAMPTZ NOT NULL,
        row_count     INT NOT NULL,
        seats_per_row INT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT events_row_count_range CHECK (row_count BETWEEN 1 AND 26),
        CONSTRAINT events_seats_per_row_positive CHECK (seats_per_row >= 1)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE zones (
        id           SERIAL PRIMARY KEY,
        event_id     INT NOT NULL REFERENCES events (id),
        name         TEXT NOT NULL,
        from_row     CHAR(1) NOT NULL,
        to_row       CHAR(1) NOT NULL,
        price_agorot INT NOT NULL,
        CONSTRAINT zones_event_name_unique UNIQUE (event_id, name),
        CONSTRAINT zones_row_order CHECK (from_row <= to_row),
        CONSTRAINT zones_price_not_negative CHECK (price_agorot >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE seats (
        id          SERIAL PRIMARY KEY,
        event_id    INT NOT NULL REFERENCES events (id),
        zone_id     INT NOT NULL REFERENCES zones (id),
        label       TEXT NOT NULL,
        row_letter  CHAR(1) NOT NULL,
        seat_number INT NOT NULL,
        CONSTRAINT seats_event_label_unique UNIQUE (event_id, label),
        CONSTRAINT seats_number_positive CHECK (seat_number >= 1)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE seats');
    await queryRunner.query('DROP TABLE zones');
    await queryRunner.query('DROP TABLE events');
  }
}
