import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(VectorSearchService.name);

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
    this.logger.debug(`Starting vector search for query: "${query}" (topK=${topK})`);

    // 1. Générer l'embedding de la question
    const queryEmbeddingData = await this.embeddingsService.generateEmbedding(query);
    const queryEmbedding = queryEmbeddingData.embedding;
    this.logger.debug(`Generated query embedding (${queryEmbedding.length} dimensions)`);

    // 2. Formater le vecteur pour pgvector
    const vectorString = `[${queryEmbedding.join(',')}]`;
    this.logger.debug(`Formatted vector string (${vectorString.length} chars)`);

    // 3. Requête SQL avec pgvector pour recherche de similarité cosine
    // Utilise l'index HNSW pour performance O(log n) au lieu de O(n)
    this.logger.debug('Executing pgvector similarity search...');
    const startTime = Date.now();

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

    const searchTime = Date.now() - startTime;
    this.logger.debug(`Vector search completed in ${searchTime}ms, found ${results.entities.length} results`);

    // 4. Formater les résultats
    const formattedResults = results.entities.map((embedding, index) => ({
      contentId: embedding.content.contentId,
      mediaKey: embedding.content.metaMedia?.key || '',
      title: embedding.content.title,
      url: embedding.content.metaMedia?.url || '',
      chunkText: embedding.chunkText,
      similarity: parseFloat(results.raw[index].similarity),
      chunkIndex: embedding.chunkIndex,
    }));

    this.logger.debug(
      `Top result: "${formattedResults[0]?.title}" (similarity: ${formattedResults[0]?.similarity.toFixed(3)})`,
    );

    return formattedResults;
  }

}
