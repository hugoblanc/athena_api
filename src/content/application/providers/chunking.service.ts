import { Injectable } from '@nestjs/common';

export interface TextChunk {
  text: string;
  index: number;
  wordCount: number;
}

@Injectable()
export class ChunkingService {
  private static readonly TARGET_CHUNK_SIZE = 700; // mots
  private static readonly MIN_CHUNK_SIZE = 600;
  private static readonly MAX_CHUNK_SIZE = 800;
  private static readonly OVERLAP_SIZE = 100; // mots

  /**
   * Découpe un texte en chunks avec overlap
   * Utilise le découpage par phrases pour préserver le sens
   */
  chunkText(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const words = this.splitIntoWords(text);

    // Si le texte est court, un seul chunk suffit
    if (words.length <= ChunkingService.MAX_CHUNK_SIZE) {
      return [
        {
          text: words.join(' '),
          index: 0,
          wordCount: words.length,
        },
      ];
    }

    const chunks: TextChunk[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    while (currentPosition < words.length) {
      // Extraire TARGET_CHUNK_SIZE mots
      const chunkWords = words.slice(
        currentPosition,
        currentPosition + ChunkingService.TARGET_CHUNK_SIZE,
      );

      // Trouver la dernière phrase complète dans ce chunk
      const chunkText = this.findLastCompleteSentence(
        chunkWords.join(' '),
        ChunkingService.MIN_CHUNK_SIZE,
      );

      const actualWords = this.splitIntoWords(chunkText);

      chunks.push({
        text: chunkText,
        index: chunkIndex,
        wordCount: actualWords.length,
      });

      // Avancer en tenant compte de l'overlap
      const advance = Math.max(
        actualWords.length - ChunkingService.OVERLAP_SIZE,
        ChunkingService.MIN_CHUNK_SIZE,
      );

      currentPosition += advance;
      chunkIndex++;

      // Éviter les boucles infinies
      if (advance === 0) {
        currentPosition += ChunkingService.MIN_CHUNK_SIZE;
      }
    }

    return chunks;
  }

  /**
   * Trouve la dernière phrase complète dans un texte
   * pour éviter de couper au milieu d'une phrase
   */
  private findLastCompleteSentence(text: string, minWords: number): string {
    // Chercher le dernier point, point d'exclamation ou d'interrogation
    const sentenceEndings = /[.!?]\s+/g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;

    while ((match = sentenceEndings.exec(text)) !== null) {
      lastMatch = match;
    }

    if (lastMatch) {
      const cutText = text.substring(0, lastMatch.index + 1).trim();
      const cutWords = this.splitIntoWords(cutText);

      // Vérifier qu'on a au moins minWords
      if (cutWords.length >= minWords) {
        return cutText;
      }
    }

    // Si pas de phrase complète trouvée, retourner le texte complet
    return text.trim();
  }

  /**
   * Découpe un texte en mots (split sur les espaces)
   */
  private splitIntoWords(text: string): string[] {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Estime le nombre de tokens (approximation: 1 mot ≈ 1.3 tokens)
   */
  estimateTokenCount(text: string): number {
    const wordCount = this.splitIntoWords(text).length;
    return Math.ceil(wordCount * 1.3);
  }
}
