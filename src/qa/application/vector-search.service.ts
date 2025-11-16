import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEmbedding } from '../../content/domain/content-embedding.entity';
import { EmbeddingsService } from '../../content/application/providers/embeddings.service';

export interface SearchResult {
  contentId: string;
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
   * @param query Question de l'utilisateur
   * @param topK Nombre de résultats à retourner
   * @returns Liste des chunks les plus pertinents avec scores
   */
  async searchSimilar(query: string, topK: number = 5): Promise<SearchResult[]> {
    // 1. Générer l'embedding de la question
    const queryEmbeddingData = await this.embeddingsService.generateEmbedding(query);
    const queryEmbedding = queryEmbeddingData.embedding;

    // 2. Récupérer tous les embeddings avec leurs contenus
    // Note: En production avec VECTOR type + HNSW index, on utilisera une requête SQL optimisée
    // Pour l'instant, on fait la similarité en mémoire (acceptable pour <20k chunks)
    const allEmbeddings = await this.contentEmbeddingRepository.find({
      relations: ['content', 'content.metaMedia'],
      select: {
        id: true,
        chunkIndex: true,
        chunkText: true,
        embedding: true,
        content: {
          contentId: true,
          title: true,
        },
      },
    });

    // 3. Calculer la similarité cosine pour chaque chunk
    const resultsWithSimilarity = allEmbeddings.map((embedding) => {
      const similarity = this.cosineSimilarity(
        queryEmbedding,
        embedding.embedding,
      );

      return {
        contentId: embedding.content.contentId,
        title: embedding.content.title,
        url: embedding.content.metaMedia?.url || '',
        chunkText: embedding.chunkText,
        similarity,
        chunkIndex: embedding.chunkIndex,
      };
    });

    // 4. Trier par similarité décroissante et prendre les top K
    resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    return resultsWithSimilarity.slice(0, topK);
  }

  /**
   * Calcule la similarité cosine entre deux vecteurs
   * cos(θ) = (A · B) / (||A|| * ||B||)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}
