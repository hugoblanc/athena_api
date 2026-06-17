import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { LawProposalService } from '../application/law-proposal.service';
import { LawOgImageService } from './law-og-image.service';
import { OG_STORAGE, OgStorage } from './og-storage';

/**
 * Orchestration des images OG des lois.
 *
 * - **Lazy** (`getOrGenerate`) : sert l'image en cache, ou la génère une fois à
 *   la première demande (premier partage/crawl) puis la persiste.
 * - **Pré-chauffe** : au démarrage, une file séquentielle génère les OG
 *   manquantes **une toutes les N secondes** (défaut 5 s), sur toute la base.
 *   Priorité basse, jamais plus d'une image en mémoire à la fois → aucun pic
 *   RAM sur le VPS. Les images déjà présentes sont sautées (reprise gratuite).
 * - **Hook scraping** (`enqueue`) : une nouvelle loi scrappée est ajoutée à la
 *   file pour avoir son OG prête avant le premier partage.
 */
@Injectable()
export class LawOgService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LawOgService.name);
  private readonly intervalMs = Number(
    process.env.OG_PREWARM_INTERVAL_MS || 5000,
  );
  private readonly prewarmEnabled = process.env.OG_PREWARM !== 'off';

  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lawProposalService: LawProposalService,
    private readonly imageService: LawOgImageService,
    @Inject(OG_STORAGE) private readonly storage: OgStorage,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.imageService.available) {
      this.logger.warn('Génération OG indisponible (polices) — pré-chauffe annulée');
      return;
    }
    if (!this.prewarmEnabled) {
      this.logger.log('Pré-chauffe OG désactivée (OG_PREWARM=off)');
      return;
    }
    // Différé léger pour ne pas concurrencer le boot.
    setTimeout(() => this.prewarmAll().catch(err =>
      this.logger.error('Erreur pré-chauffe OG', err),
    ), 10_000);
  }

  /** Enfile toutes les lois existantes (les déjà-générées seront sautées). */
  private async prewarmAll(): Promise<void> {
    const rows = await this.prisma.lawProposal.findMany({
      select: { numero: true },
      orderBy: { dateMiseEnLigne: 'desc' },
    });
    for (const r of rows) this.enqueue(r.numero);
    this.logger.log(
      `Pré-chauffe OG: ${rows.length} lois en file (1 / ${this.intervalMs / 1000}s)`,
    );
  }

  /** Ajoute un numéro à la file de génération (idempotent) et lance le worker. */
  enqueue(numero: string): void {
    if (this.queued.has(numero)) return;
    this.queued.add(numero);
    this.queue.push(numero);
    this.startWorker();
  }

  private startWorker(): void {
    if (this.timer) return;
    const tick = async () => {
      const numero = this.queue.shift();
      if (numero === undefined) {
        // File vide : on arrête le worker (relancé au prochain enqueue).
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        return;
      }
      this.queued.delete(numero);
      try {
        await this.ensureGenerated(numero);
      } catch (err) {
        this.logger.warn(`OG loi ${numero} échouée: ${err}`);
      }
      this.timer = setTimeout(tick, this.intervalMs);
    };
    // Premier passage immédiat, puis cadencé.
    this.timer = setTimeout(tick, 0);
  }

  /** Génère + persiste l'OG si absente. No-op si déjà en cache. */
  private async ensureGenerated(numero: string): Promise<Buffer | null> {
    if (await this.storage.has(numero)) {
      return this.storage.read(numero);
    }
    const detail = await this.lawProposalService.findByNumero(numero);
    if (!detail) return null;
    const png = await this.imageService.generate(detail);
    await this.storage.write(numero, png);
    this.logger.log(`OG générée: loi ${numero}`);
    return png;
  }

  /**
   * Sert l'OG (cache) ou la génère à la demande (premier accès).
   * Retourne null si la loi n'existe pas / génération indisponible.
   */
  async getOrGenerate(numero: string): Promise<Buffer | null> {
    const cached = await this.storage.read(numero);
    if (cached) return cached;
    if (!this.imageService.available) return null;
    return this.ensureGenerated(numero);
  }
}
