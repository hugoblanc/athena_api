import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Content } from './content.entity';

@Entity()
@Index('idx_content_chunk', ['content', 'chunkIndex'], { unique: true })
export class ContentEmbedding {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Content, content => content.embeddings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column('int')
  @Index('idx_chunk_index')
  chunkIndex: number; // Position du chunk (0, 1, 2...)

  @Column('text')
  chunkText: string; // Le texte du chunk

  @Column('int')
  tokenCount: number; // Nombre de tokens (utile pour tracking coût)

  // Vecteur d'embedding (1536 dimensions pour text-embedding-3-small)
  // MySQL 9.1+ type VECTOR(1536)
  // TypeORM ne connaît pas nativement le type VECTOR, donc on utilise 'text' avec un transformer
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: number[] | null): string | null => {
        // Convertir number[] en format VECTOR MySQL: "[0.1, 0.2, 0.3]"
        if (!value) return null;
        return JSON.stringify(value);
      },
      from: (value: string | null): number[] | null => {
        // Convertir le string VECTOR MySQL en number[]
        if (!value) return null;
        // MySQL VECTOR retourne déjà un string JSON-like
        return JSON.parse(value);
      },
    },
  })
  embedding: number[];

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column('timestamp', {
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  constructor(input?: Partial<ContentEmbedding>) {
    if (input) {
      Object.assign(this, input);
    }
  }
}
