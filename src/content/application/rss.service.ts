import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Page } from '../../core/page';
import { RequestedPageValueType } from '../../core/page-number.value-type';
import { MetaMediaService } from '../../meta-media/meta-media.service';
import { Content } from '../domain/content.entity';
import { GetLastContentPaginatedQuery } from './queries/get-last-content-paginated/get-last-content-paginated.query';
import { MediaKeysValueType } from './queries/get-last-content-paginated/media-keys.value-type';
import { SearchedContentTermValueType } from './queries/get-last-content-paginated/searched-content-term.value-type';

/** Base URL publique de la PWA (liens canoniques de partage). */
const RSS_BASE_URL =
  process.env.PWA_BASE_URL?.replace(/\/$/, '') ?? 'https://www.athena-app.fr';

/** Nombre de contenus exposés dans le flux. */
const RSS_ITEMS = 30;

/** Durée de vie d'une entrée de cache (10 min). */
const RSS_CACHE_TTL_MS = 10 * 60 * 1000;

/** Borne dure du cache : empêche toute croissance illimitée (éviction FIFO). */
const RSS_CACHE_MAX_ENTRIES = 200;

/** Durée de vie du jeu de clés médias valides (évite un SELECT par requête). */
const VALID_KEYS_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  xml: string;
  expiresAt: number;
}

/**
 * Génère un flux RSS 2.0 des derniers contenus, optionnellement filtré par
 * médias. Pensé pour être branché dans un lecteur RSS tiers (export).
 * Réutilise la récupération de contenu existante (GetLastContentPaginatedQuery).
 *
 * Endpoint public + `medias` arbitraire : le cache est BORNÉ (max
 * RSS_CACHE_MAX_ENTRIES, purge des entrées expirées + éviction FIFO) et on ne
 * met en cache QUE les requêtes dont toutes les clés correspondent à des médias
 * existants. Une requête à clés inconnues est servie sans être cachée → pas de
 * vecteur d'OOM/DoS via `?medias=rand1,rand2,…`.
 */
@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private validKeys: Set<string> | null = null;
  private validKeysExpiresAt = 0;

  constructor(
    private readonly queryBus: QueryBus,
    private readonly metaMediaService: MetaMediaService,
  ) {}

  /** Renvoie le XML du flux RSS pour les médias demandés (tous si vide). */
  async getFeed(medias?: string): Promise<string> {
    const keys = new MediaKeysValueType(medias);
    const requested = keys.values;

    // Ne cache que si toutes les clés demandées existent (ou aucune = tous médias).
    const cacheable =
      requested.length === 0 || (await this.allKeysExist(requested));

    const cacheKey = requested.slice().sort().join(',');

    if (cacheable) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.xml;
      }
    }

    const page: Page<Content> = await this.queryBus.execute(
      new GetLastContentPaginatedQuery(
        new RequestedPageValueType(1, RSS_ITEMS),
        new SearchedContentTermValueType(undefined),
        keys,
      ),
    );

    const xml = this.buildXml(page.objects, requested);

    if (cacheable) {
      this.store(cacheKey, xml);
    }
    return xml;
  }

  /** Vrai si toutes les clés demandées correspondent à un média existant. */
  private async allKeysExist(requested: string[]): Promise<boolean> {
    const valid = await this.getValidKeys();
    return requested.every((k) => valid.has(k));
  }

  /** Jeu des clés médias valides, mis en cache quelques minutes. */
  private async getValidKeys(): Promise<Set<string>> {
    if (this.validKeys && this.validKeysExpiresAt > Date.now()) {
      return this.validKeys;
    }
    const medias = await this.metaMediaService.findAll();
    this.validKeys = new Set(medias.map((m) => m.key));
    this.validKeysExpiresAt = Date.now() + VALID_KEYS_TTL_MS;
    return this.validKeys;
  }

  /** Écrit dans le cache borné : purge des entrées expirées + éviction FIFO. */
  private store(cacheKey: string, xml: string): void {
    const now = Date.now();
    for (const [k, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(k);
      }
    }
    // Réinsère en queue (ordre d'insertion = ordre d'éviction FIFO).
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, { xml, expiresAt: now + RSS_CACHE_TTL_MS });
    while (this.cache.size > RSS_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) {
        break;
      }
      this.cache.delete(oldest);
    }
  }

  /** Construit le document RSS 2.0 complet. */
  private buildXml(contents: Content[], mediaKeys: string[]): string {
    const channelTitle =
      mediaKeys.length > 0
        ? `Athena - ${mediaKeys.join(', ')}`
        : 'Athena - Médias libres';
    const channelLink = RSS_BASE_URL;
    const channelDescription =
      'Les derniers contenus des médias libres agrégés par Athena.';
    const lastBuildDate = new Date().toUTCString();

    const items = contents.map((c) => this.buildItem(c)).join('');

    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0">\n' +
      '  <channel>\n' +
      `    <title>${escapeXml(channelTitle)}</title>\n` +
      `    <link>${escapeXml(channelLink)}</link>\n` +
      `    <description>${escapeXml(channelDescription)}</description>\n` +
      '    <language>fr</language>\n' +
      `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
      items +
      '  </channel>\n' +
      '</rss>\n'
    );
  }

  /** Construit un <item> à partir d'un contenu. */
  private buildItem(content: Content): string {
    const key = content.metaMedia?.key ?? '';
    const mediaTitle = content.metaMedia?.title ?? 'Athena';
    // Lien canonique de partage (la PWA gère la redirection vers l'origine).
    const link = `${RSS_BASE_URL}/content/${encodeURIComponent(
      key,
    )}/${encodeURIComponent(content.contentId)}`;
    const pubDate = content.publishedAt
      ? new Date(content.publishedAt).toUTCString()
      : '';
    const description = `${mediaTitle} - ${content.title}`;

    return (
      '    <item>\n' +
      `      <title>${escapeXml(content.title)}</title>\n` +
      `      <link>${escapeXml(link)}</link>\n` +
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>\n` +
      (pubDate ? `      <pubDate>${pubDate}</pubDate>\n` : '') +
      `      <description>${escapeXml(description)}</description>\n` +
      '    </item>\n'
    );
  }
}

/** Échappe les caractères XML réservés. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
