/**
 * Types pour la structure simplifiée des propositions de loi
 */

export interface SimplifiedKeyPoint {
  text: string; // 50-100 caractères
}

export interface SimplifiedExposeMotif {
  ordre: number;
  titre: string; // 2-5 mots
  texte: string; // 100-200 mots
}

export interface SimplifiedArticle {
  ordre: number;
  numero: string; // "Article 1", "Article 2", etc.
  resume: string; // 30-80 mots
}

export interface SimplifiedData {
  status: 'completed' | 'pending' | 'failed';
  generatedAt: string; // ISO 8601
  keyPoints: string[]; // 3-4 points de 50-100 chars
  exposeMotifs: SimplifiedExposeMotif[];
  articles: SimplifiedArticle[];
}

/**
 * Type guard pour vérifier si les données simplifiées sont valides
 */
export function isValidSimplifiedData(data: any): data is SimplifiedData {
  return (
    data &&
    typeof data === 'object' &&
    ['completed', 'pending', 'failed'].includes(data.status) &&
    typeof data.generatedAt === 'string' &&
    Array.isArray(data.keyPoints) &&
    Array.isArray(data.exposeMotifs) &&
    Array.isArray(data.articles)
  );
}
