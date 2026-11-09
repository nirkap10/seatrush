import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersHolds1794096000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id         SERIAL PRIMARY KEY,
        username   TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE holds (
        id         SERIAL PRIMARY KEY,
        event_id   INT NOT NULL REFERENCES events (id),
        user_id    INT NOT NULL REFERENCES users (id),
        expires_at TIMESTAMPTZ NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT holds_status_valid
          CHECK (status IN ('active', 'released', 'converted'))
      )
    `);

    await queryRunner.query(
      'ALTER TABLE seats ADD COLUMN hold_id INT REFERENCES holds (id)',
    );

    await queryRunner.query('CREATE INDEX seats_hold_id ON seats (hold_id)');
    await queryRunner.query(
      'CREATE INDEX holds_event_user ON holds (event_id, user_id)',
    );

    await queryRunner.query(`
      ALTER TABLE events
        DROP CONSTRAINT events_seats_per_row_positive,
        ADD CONSTRAINT events_seats_per_row_range
          CHECK (seats_per_row BETWEEN 1 AND 100)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
        DROP CONSTRAINT events_seats_per_row_range,
        ADD CONSTRAINT events_seats_per_row_positive
          CHECK (seats_per_row >= 1)
    `);
    await queryRunner.query('ALTER TABLE seats DROP COLUMN hold_id');
    await queryRunner.query('DROP TABLE holds');
    await queryRunner.query('DROP TABLE users');
  }
}
