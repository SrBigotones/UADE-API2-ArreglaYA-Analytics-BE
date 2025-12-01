import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('events')
@Index(['squad', 'topico', 'evento'])
@Index(['timestamp'])
@Index(['processed'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  squad: string;

  @Column({ type: 'varchar', length: 100 })
  topico: string;

  @Column({ type: 'varchar', length: 100 })
  evento: string;

  @Column({ type: 'json' })
  cuerpo: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  // Core Hub specific fields for message tracking and correlation
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  messageId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  correlationId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'unknown' })
  @Index()
  source?: string; // 'core-hub', 'direct-webhook', etc.

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
