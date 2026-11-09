import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 'expired' isn't a status: a hold is expired when expiresAt has passed.
export type HoldStatus = 'active' | 'released' | 'converted';

@Entity('holds')
export class Hold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'text', default: 'active' })
  status: HoldStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
