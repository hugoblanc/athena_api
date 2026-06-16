import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  /** Fenêtre de déduplication courte : on ignore un même événement revu en moins de 6h. */
  private static readonly DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000;
  /** Plafond de la Map de dédup (drop FIFO au-delà). */
  private static readonly DEDUP_MAX_ENTRIES = 50_000;

  /** Dédup EN MÉMOIRE uniquement — jamais persistée. clé -> timestamp de dernière vue. */
  private readonly recentlySeen = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Incrémente le compteur agrégé du jour (UTC) pour la clé unique
   * (event, refType, refId, ref ?? null, day). Aucune donnée personnelle stockée.
   */
  async record(dto: CreateAnalyticsEventDto): Promise<void> {
    const ref = dto.ref ?? null;

    if (this.isDuplicate(dto)) {
      return;
    }

    const day = this.todayUtc();

    try {
      await this.prisma.analyticsCounter.upsert({
        where: {
          event_refType_refId_ref_day: {
            event: dto.event,
            refType: dto.refType,
            refId: dto.refId,
            ref,
            day,
          },
        },
        update: { count: { increment: 1 } },
        create: {
          event: dto.event,
          refType: dto.refType,
          refId: dto.refId,
          ref,
          day,
          count: 1,
        },
      });
    } catch (error) {
      // On ne casse jamais le parcours utilisateur pour un compteur analytics ;
      // on ne logge ni l'IP ni le dayHash, seulement l'erreur technique.
      this.logger.warn(
        `Échec de l'enregistrement du compteur analytics: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /** Minuit UTC du jour courant (type @db.Date côté Prisma). */
  private todayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  /**
   * Vrai si ce (dayHash, event, refType, refId) a déjà été vu il y a moins de 6h.
   * Best-effort anti-rafale, pas une garantie d'unicité. Sans dayHash : jamais dédupliqué.
   */
  private isDuplicate(dto: CreateAnalyticsEventDto): boolean {
    if (!dto.dayHash) {
      return false;
    }

    const key = `${dto.dayHash}:${dto.event}:${dto.refType}:${dto.refId}`;
    const now = Date.now();
    const lastSeen = this.recentlySeen.get(key);

    if (lastSeen !== undefined && now - lastSeen < AnalyticsService.DEDUP_WINDOW_MS) {
      return true;
    }

    this.touch(key, now);
    return false;
  }

  /** Mémorise la clé, purge les entrées expirées et plafonne la taille (drop FIFO). */
  private touch(key: string, now: number): void {
    // Re-insérer en fin de Map (ordre d'insertion) pour un FIFO correct.
    this.recentlySeen.delete(key);
    this.recentlySeen.set(key, now);

    if (this.recentlySeen.size > AnalyticsService.DEDUP_MAX_ENTRIES) {
      for (const [k, ts] of this.recentlySeen) {
        if (now - ts >= AnalyticsService.DEDUP_WINDOW_MS) {
          this.recentlySeen.delete(k);
        }
      }
      // Toujours au-dessus du plafond après purge : on retire les plus anciennes (FIFO).
      while (this.recentlySeen.size > AnalyticsService.DEDUP_MAX_ENTRIES) {
        const oldest = this.recentlySeen.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        this.recentlySeen.delete(oldest);
      }
    }
  }
}
