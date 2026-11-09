import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1794182400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id           SERIAL PRIMARY KEY,
        hold_id      INT NOT NULL UNIQUE REFERENCES holds (id),
        user_id      INT NOT NULL REFERENCES users (id),
        event_id     INT NOT NULL REFERENCES events (id),
        total_agorot INT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT orders_total_not_negative CHECK (total_agorot >= 0)
      )
    `);

    await queryRunner.query(
      'ALTER TABLE seats ADD COLUMN order_id INT REFERENCES orders (id)',
    );

    await queryRunner.query('CREATE INDEX seats_order_id ON seats (order_id)');
    await queryRunner.query(
      'CREATE INDEX orders_user_event ON orders (user_id, event_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE seats DROP COLUMN order_id');
    await queryRunner.query('DROP TABLE orders');
  }
}
