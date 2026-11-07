import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'from_row', type: 'char', length: 1 })
  fromRow: string;

  @Column({ name: 'to_row', type: 'char', length: 1 })
  toRow: string;

  @Column({ name: 'price_agorot', type: 'int' })
  priceAgorot: number;
}
