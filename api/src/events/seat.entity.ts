import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @Column({ name: 'zone_id', type: 'int' })
  zoneId: number;

  @Column({ type: 'text' })
  label: string;

  @Column({ name: 'row_letter', type: 'char', length: 1 })
  rowLetter: string;

  @Column({ name: 'seat_number', type: 'int' })
  seatNumber: number;
}
