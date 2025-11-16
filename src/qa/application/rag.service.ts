import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { VectorSearchService, SearchResult } from './vector-search.service';
import { QaSource } from '../domain/qa-job.entity';

export interface RagContext {
  sources: QaSource[];
  contextText: string;
}

export interface StreamChunk {
  token: string;
  done: boolean;
}

@Injectable()
export class RagService {
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4o-mini'; // Cost-effective streaming model

  constructor(
    private httpService: HttpService,
    private vectorSearchService: VectorSearchService,
  ) {}

  /**
   * Construit le contexte RAG à partir d'une question
   * @param question Question de l'utilisateur
   * @returns Contexte avec sources et texte formaté
   */
  async buildContext(question: string): Promise<RagContext> {
    // Récupérer les 5 chunks les plus pertinents
    const searchResults = await this.vectorSearchService.searchSimilar(question, 5);

    // Formater les sources pour la réponse
    const sources: QaSource[] = searchResults.map((result) => ({
      contentId: result.contentId,
      title: result.title,
      url: result.url,
      relevanceScore: result.similarity,
      chunkText: result.chunkText,
    }));

    // Construire le texte de contexte pour le LLM
    const contextText = this.formatContextForLLM(searchResults);

    return { sources, contextText };
  }

  /**
   * Formate les résultats de recherche en contexte pour le LLM
   */
  private formatContextForLLM(results: SearchResult[]): string {
    let context = 'Contexte (articles pertinents) :\n\n';

    results.forEach((result, index) => {
      context += `--- Article ${index + 1}: ${result.title} ---\n`;
      context += `${result.chunkText}\n\n`;
    });

    return context;
  }

  /**
   * Génère une réponse en streaming via OpenAI
   * @param question Question de l'utilisateur
   * @param context Contexte RAG
   * @returns AsyncGenerator de tokens
   */
  async *streamAnswer(
    question: string,
    context: RagContext,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = `Tu es un assistant intelligent qui répond aux questions en te basant UNIQUEMENT sur les articles fournis en contexte.

Règles :
- Réponds en français de manière claire et concise
- Base-toi UNIQUEMENT sur les informations fournies dans le contexte
- Si le contexte ne contient pas assez d'informations pour répondre, dis-le clairement
- Cite les articles pertinents dans ta réponse quand c'est approprié
- Ne invente pas d'informations qui ne sont pas dans le contexte`;

    const userPrompt = `${context.contextText}\n\nQuestion : ${question}\n\nRéponds en te basant uniquement sur le contexte ci-dessus.`;

    // Appel streaming à OpenAI
    const response = await firstValueFrom(
      this.httpService.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      ),
    );

    // Parser le stream SSE d'OpenAI
    const stream = response.data;

    for await (const chunk of stream) {
      const lines = chunk
        .toString()
        .split('\n')
        .filter((line: string) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            yield { token: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;

            if (token) {
              yield { token, done: false };
            }
          } catch (error) {
            // Ignore parsing errors for malformed chunks
            continue;
          }
        }
      }
    }

    yield { token: '', done: true };
  }

  /**
   * Génère une réponse complète (non-streaming) pour les cas où on veut juste le résultat final
   * @param question Question de l'utilisateur
   * @param context Contexte RAG
   * @returns Réponse complète
   */
  async generateAnswer(question: string, context: RagContext): Promise<string> {
    let fullAnswer = '';

    for await (const chunk of this.streamAnswer(question, context)) {
      if (!chunk.done) {
        fullAnswer += chunk.token;
      }
    }

    return fullAnswer;
  }
}
