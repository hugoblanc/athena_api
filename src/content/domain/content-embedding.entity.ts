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
  // MySQL 9.1+ supporte le type VECTOR
  // On force TypeORM à utiliser le bon type SQL même s'il ne le connaît pas nativement
  @Column({
    type: 'simple-json',  // TypeORM type (pour la sérialisation)
    nullable: true,
    // Le vrai type SQL sera créé via synchronize:false + migration manuelle
    // ou on le change après coup avec ALTER TABLE
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
