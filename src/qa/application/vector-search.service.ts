import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEmbedding } from '../../content/domain/content-embedding.entity';
import { EmbeddingsService } from '../../content/application/providers/embeddings.service';

export interface SearchResult {
  contentId: string;
  mediaKey: string;
  title: string;
  url: string;
  chunkText: string;
  similarity: number;
  chunkIndex: number;
}

@Injectable()
export class VectorSearchService {
  constructor(
    @InjectRepository(ContentEmbedding)
    private contentEmbeddingRepository: Repository<ContentEmbedding>,
    private embeddingsService: EmbeddingsService,
  ) {}

  /**
   * Recherche sémantique par similarité cosine
   * Utilise pgvector + index HNSW pour performance optimale
   * @param query Question de l'utilisateur
   * @param topK Nombre de résultats à retourner
   * @returns Liste des chunks les plus pertinents avec scores
   */
  async searchSimilar(query: string, topK: number = 5): Promise<SearchResult[]> {
    // 1. Générer l'embedding de la question
    const queryEmbeddingData = await this.embeddingsService.generateEmbedding(query);
    const queryEmbedding = queryEmbeddingData.embedding;

    // 2. Formater le vecteur pour pgvector
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // 3. Requête SQL avec pgvector pour recherche de similarité cosine
    // Utilise l'index HNSW pour performance O(log n) au lieu de O(n)
    const results = await this.contentEmbeddingRepository
      .createQueryBuilder('embedding')
      .leftJoinAndSelect('embedding.content', 'content')
      .leftJoinAndSelect('content.metaMedia', 'metaMedia')
      .select([
        'embedding.id',
        'embedding.chunkIndex',
        'embedding.chunkText',
        'content.contentId',
        'content.title',
        'metaMedia.key',
        'metaMedia.url',
      ])
      .addSelect(
        `1 - (embedding.embedding <=> '${vectorString}'::vector)`,
        'similarity',
      )
      .orderBy(`embedding.embedding <=> '${vectorString}'::vector`, 'ASC')
      .limit(topK)
      .getRawAndEntities();

    // 4. Formater les résultats
    return results.entities.map((embedding, index) => ({
      contentId: embedding.content.contentId,
      mediaKey: embedding.content.metaMedia?.key || '',
      title: embedding.content.title,
      url: embedding.content.metaMedia?.url || '',
      chunkText: embedding.chunkText,
      similarity: parseFloat(results.raw[index].similarity),
      chunkIndex: embedding.chunkIndex,
    }));
  }

}
