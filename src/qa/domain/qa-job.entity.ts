import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type QaJobStatus = 'processing' | 'completed' | 'error';

export interface QaSource {
  contentId: string;
  title: string;
  url: string;
  relevanceScore: number;
  chunkText: string;
}

@Entity('qa_jobs')
@Index('idx_status', ['status'])
@Index('idx_created_at', ['createdAt'])
export class QaJob {
  @PrimaryColumn('varchar', { length: 36 })
  id: string; // UUID v4

  @Column('text')
  question: string;

  @Column('text', { nullable: true })
  answer: string | null;

  @Column('simple-json', { nullable: true })
  sources: QaSource[] | null;

  @Column('varchar', { length: 20 })
  status: QaJobStatus;

  @Column('text', { nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date | null;

  constructor(input?: Partial<QaJob>) {
    if (input) {
      Object.assign(this, input);
    }
  }
}
