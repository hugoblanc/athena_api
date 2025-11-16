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
  // PostgreSQL pgvector: type vector(1536)
  // TypeORM ne supporte pas nativement 'vector', on utilise un cast SQL
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: number[] | null): string | null => {
        // Convertir number[] en format pgvector: "[0.1,0.2,0.3]"
        if (!value) return null;
        return `[${value.join(',')}]`;
      },
      from: (value: any): number[] | null => {
        // PostgreSQL pgvector retourne déjà un array
        if (!value) return null;
        if (Array.isArray(value)) return value;
        // Si string, parser: "[0.1,0.2,0.3]" -> [0.1,0.2,0.3]
        if (typeof value === 'string') {
          return value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(Number);
        }
        return null;
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
