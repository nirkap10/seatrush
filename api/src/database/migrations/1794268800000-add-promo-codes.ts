import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoCodes1794268800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // WELCOME20 is once per fan ever.
    await queryRunner.query(
      'ALTER TABLE users ADD COLUMN welcome20_used BOOLEAN NOT NULL DEFAULT false',
    );
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN promo_code      TEXT,
        ADD COLUMN discount_agorot INT NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE orders DROP COLUMN promo_code, DROP COLUMN discount_agorot',
    );
    await queryRunner.query('ALTER TABLE users DROP COLUMN welcome20_used');
  }
}
