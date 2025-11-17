import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EmbeddingResponse {
  embedding: number[];
  tokenCount: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly apiUrl = 'https://api.openai.com/v1/embeddings';
  private readonly model = 'text-embedding-3-small';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Génère un embedding pour un texte donné
   * @param text Le texte à embedder
   * @returns Le vecteur d'embedding (1536 dimensions) et le nombre de tokens
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            model: this.model,
            input: text,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const embedding = response.data.data[0].embedding;
      const tokenCount = response.data.usage.total_tokens;

      this.logger.debug(
        `Generated embedding with ${tokenCount} tokens`,
      );

      return {
        embedding,
        tokenCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error.message}`,
        error.stack,
      );
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Génère des embeddings pour plusieurs textes en batch
   * OpenAI supporte jusqu'à 2048 inputs par requête
   * @param texts Les textes à embedder
   * @returns Les vecteurs d'embedding
   */
  async generateEmbeddingsBatch(
    texts: string[],
  ): Promise<EmbeddingResponse[]> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set',
      );
    }

    if (texts.length === 0) {
      return [];
    }

    // OpenAI limite à 2048 inputs par requête
    const batchSize = 2048;
    const results: EmbeddingResponse[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await firstValueFrom(
          this.httpService.post(
            this.apiUrl,
            {
              model: this.model,
              input: batch,
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        const embeddings = response.data.data.map((item: any, index: number) => ({
          embedding: item.embedding,
          tokenCount: Math.round(response.data.usage.total_tokens / batch.length), // Approximation arrondie
        }));

        results.push(...embeddings);

        this.logger.log(
          `Generated ${embeddings.length} embeddings (batch ${Math.floor(i / batchSize) + 1})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate embeddings for batch ${Math.floor(i / batchSize) + 1}: ${error.message}`,
        );
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }

    return results;
  }
}
