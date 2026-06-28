import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ContentOgImageService } from './content-og-image.service';
import { CONTENT_OG_STORAGE, ContentOgStorage } from './content-og-storage';
import { GetShareableContentQuery } from '../application/queries/get-shareable-content/get-shareable-content.query';
import { ShareableContentResponse } from '../application/dto/shareable-content.dto';

/**
 * Orchestration des images OG des contenus.
 *
 * **Lazy uniquement** (pas de pré-chauffe comme pour les lois) : le volume de
 * contenus (des milliers d'articles/vidéos) rend une génération de masse
 * inutile et coûteuse. On génère à la première demande (premier partage/crawl
 * réseau social) puis on persiste. Une seule image en RAM à la fois.
 *
 * Concurrence : si deux crawlers demandent la même OG en même temps, on
 * déduplique la génération en cours via une map de promesses (évite de lancer
 * satori 2× pour rien).
 */
@Injectable()
export class ContentOgService {
  private readonly logger = new Logger(ContentOgService.name);
  private readonly inFlight = new Map<string, Promise<Buffer | null>>();

  constructor(
    private readonly queryBus: QueryBus,
    private readonly imageService: ContentOgImageService,
    @Inject(CONTENT_OG_STORAGE) private readonly storage: ContentOgStorage,
  ) {}

  /**
   * Sert l'OG (cache) ou la génère à la demande (premier accès).
   * Retourne null si le contenu n'existe pas / génération indisponible.
   */
  async getOrGenerate(key: string, contentId: string): Promise<Buffer | null> {
    const cached = await this.storage.read(key, contentId);
    if (cached) return cached;
    if (!this.imageService.available) return null;

    const dedupKey = `${key}/${contentId}`;
    const existing = this.inFlight.get(dedupKey);
    if (existing) return existing;

    const task = this.generate(key, contentId).finally(() =>
      this.inFlight.delete(dedupKey),
    );
    this.inFlight.set(dedupKey, task);
    return task;
  }

  private async generate(key: string, contentId: string): Promise<Buffer | null> {
    let data: ShareableContentResponse;
    try {
      data = await this.queryBus.execute(
        new GetShareableContentQuery(key, contentId),
      );
    } catch {
      // Contenu introuvable (404) ou erreur de résolution → pas d'OG.
      return null;
    }
    if (!data) return null;

    const png = await this.imageService.generate({
      title: data.title,
      mediaTitle: data.mediaTitle,
      mediaType: data.mediaType,
      imageUrl: data.image?.url ?? null,
    });
    await this.storage.write(key, contentId, png);
    this.logger.log(`OG générée: contenu ${key}/${contentId}`);
    return png;
  }
}
