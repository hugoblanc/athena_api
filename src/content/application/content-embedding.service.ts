import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Content } from '../domain/content.entity';
import { ContentEmbedding } from '../domain/content-embedding.entity';
import { ChunkingService } from './providers/chunking.service';
import { EmbeddingsService } from './providers/embeddings.service';

export interface EmbeddingGenerationResult {
  contentId: string;
  chunksCreated: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class ContentEmbeddingService {
  private readonly logger = new Logger(ContentEmbeddingService.name);

  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(ContentEmbedding)
    private readonly embeddingRepository: Repository<ContentEmbedding>,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Génère les embeddings pour un article
   * 1. Chunke le texte
   * 2. Génère les embeddings pour chaque chunk
   * 3. Sauvegarde en DB
   */
  async generateEmbeddingsForContent(
    content: Content,
  ): Promise<EmbeddingGenerationResult> {
    try {
      this.logger.log(
        `Starting embedding generation for content ${content.contentId}`,
      );

      // 1. Vérifier qu'on a du plainText
      if (!content.plainText || content.plainText.trim().length === 0) {
        throw new Error('Content has no plainText');
      }

      // 2. Chunker le texte
      const chunks = this.chunkingService.chunkText(content.plainText);

      if (chunks.length === 0) {
        throw new Error('No chunks generated');
      }

      this.logger.debug(
        `Generated ${chunks.length} chunks for content ${content.contentId}`,
      );

      // 3. Générer les embeddings pour chaque chunk (en batch)
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddingsData = await this.embeddingsService.generateEmbeddingsBatch(
        chunkTexts,
      );

      // 4. Sauvegarder les embeddings en DB (dans une transaction)
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Supprimer les anciens embeddings pour ce content
        await queryRunner.manager.delete(ContentEmbedding, {
          content: { id: content.id },
        });

        // Créer les nouveaux embeddings
        const contentEmbeddings = chunks.map((chunk, index) => {
          const embeddingData = embeddingsData[index];

          return new ContentEmbedding({
            content,
            chunkIndex: chunk.index,
            chunkText: chunk.text,
            tokenCount: embeddingData.tokenCount,
            embedding: embeddingData.embedding,
          });
        });

        await queryRunner.manager.save(ContentEmbedding, contentEmbeddings);

        await queryRunner.commitTransaction();

        const totalTokens = embeddingsData.reduce(
          (sum, e) => sum + e.tokenCount,
          0,
        );

        this.logger.log(
          `Successfully generated ${chunks.length} embeddings for content ${content.contentId} (${totalTokens} tokens)`,
        );

        return {
          contentId: content.contentId,
          chunksCreated: chunks.length,
          tokensUsed: totalTokens,
          success: true,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate embeddings for content ${content.contentId}: ${error.message}`,
      );

      return {
        contentId: content.contentId,
        chunksCreated: 0,
        tokensUsed: 0,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Génère les embeddings pour tous les articles qui n'en ont pas
   */
  async generateAllMissingEmbeddings(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    totalTokens: number;
    results: EmbeddingGenerationResult[];
  }> {
    this.logger.log('Starting batch embedding generation for all content');

    // Trouver tous les contents qui n'ont pas encore d'embeddings
    const contents = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoin('content.embeddings', 'embedding')
      .where('embedding.id IS NULL')
      .andWhere('content.plainText IS NOT NULL')
      .getMany();

    this.logger.log(`Found ${contents.length} contents without embeddings`);

    const results: EmbeddingGenerationResult[] = [];
    let successful = 0;
    let failed = 0;
    let totalTokens = 0;

    for (const content of contents) {
      const result = await this.generateEmbeddingsForContent(content);
      results.push(result);

      if (result.success) {
        successful++;
        totalTokens += result.tokensUsed;
      } else {
        failed++;
      }

      // Petit délai pour éviter de surcharger l'API OpenAI
      await this.sleep(100);
    }

    this.logger.log(
      `Batch generation completed: ${successful} successful, ${failed} failed, ${totalTokens} total tokens`,
    );

    return {
      processed: contents.length,
      successful,
      failed,
      totalTokens,
      results,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
