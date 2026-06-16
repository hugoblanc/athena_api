export interface ShareableContentResponse {
  image: ShareableContentImage;
  title: string;
  originalUrl: string;
  /** Titre du média source (ex. « Le Média », « Blast »). */
  mediaTitle: string;
  /** Type du média source (YOUTUBE | WORDPRESS). */
  mediaType: string;
  /** URL du logo du média source si disponible. */
  mediaLogoUrl: string | null;
}

interface ShareableContentImage {
  url: string;
  width: number;
  height: number;
}
