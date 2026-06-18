import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import {
  CreateAnalyticsEventDto,
  isAllowedRef,
} from './dto/create-analytics-event.dto';

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

    // Garde-fou cardinalité : pour les dimensions d'usage (screen/feature/session),
    // on n'enregistre que les refId connus. Drop silencieux sinon.
    if (!isAllowedRef(dto.refType, dto.refId)) {
      return;
    }

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

  /** Minuit UTC il y a `days` jours. */
  private daysAgoUtc(days: number): Date {
    const t = this.todayUtc();
    t.setUTCDate(t.getUTCDate() - days);
    return t;
  }

  private static readonly EVENTS = [
    'preview_view',
    'value_reached',
    'reshare',
    'install',
  ] as const;

  /**
   * Lecture agrégée de la growth loop sur une fenêtre.
   * k-factor viral = re-partages DEPUIS une landing (ShareIntents, ref ≠ app)
   * rapportés aux arrivées sur landing (preview_view). Les `reshare` ref=app
   * sont les partages initiaux depuis l'app (la « graine »), pas la boucle.
   */
  async funnel(opts: { days?: number; refType?: string }): Promise<unknown> {
    const days = Math.min(Math.max(1, Math.floor(opts.days ?? 30)), 365);
    const from = this.daysAgoUtc(days);

    const rows = await this.prisma.analyticsCounter.findMany({
      where: {
        day: { gte: from },
        ...(opts.refType ? { refType: opts.refType } : {}),
      },
    });

    const zero = () => ({
      preview_view: 0,
      value_reached: 0,
      reshare: 0,
      install: 0,
    });
    const totals = zero();
    const reshareByRef: Record<string, number> = {};
    const byDay = new Map<string, ReturnType<typeof zero>>();
    const byContent = new Map<
      string,
      { refType: string; refId: string } & ReturnType<typeof zero>
    >();

    const isEvent = (e: string): e is (typeof AnalyticsService.EVENTS)[number] =>
      (AnalyticsService.EVENTS as readonly string[]).includes(e);

    for (const r of rows) {
      if (!isEvent(r.event)) continue;
      totals[r.event] += r.count;

      const dayKey = r.day.toISOString().slice(0, 10);
      const d = byDay.get(dayKey) ?? zero();
      d[r.event] += r.count;
      byDay.set(dayKey, d);

      const ck = `${r.refType}:${r.refId}`;
      const c = byContent.get(ck) ?? { refType: r.refType, refId: r.refId, ...zero() };
      c[r.event] += r.count;
      byContent.set(ck, c);

      if (r.event === 'reshare') {
        const ref = r.ref ?? 'unknown';
        reshareByRef[ref] = (reshareByRef[ref] ?? 0) + r.count;
      }
    }

    const fromLanding = Object.entries(reshareByRef)
      .filter(([ref]) => ref !== 'app')
      .reduce((s, [, n]) => s + n, 0);
    const fromApp = reshareByRef['app'] ?? 0;
    const round = (n: number) => Math.round(n * 1000) / 1000;

    return {
      window: {
        days,
        from: from.toISOString().slice(0, 10),
        to: this.todayUtc().toISOString().slice(0, 10),
      },
      totals,
      rates: {
        kFactor: round(totals.preview_view ? fromLanding / totals.preview_view : 0),
        kFactorDef: 're-partages depuis une landing / arrivées sur landing (preview_view)',
        valueRate: round(
          totals.preview_view ? totals.value_reached / totals.preview_view : 0,
        ),
        installRate: round(
          totals.preview_view ? totals.install / totals.preview_view : 0,
        ),
        installRateDef: 'installs PWA depuis une landing / arrivées (preview_view)',
      },
      reshare: { total: totals.reshare, fromApp, fromLanding, byRef: reshareByRef },
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, v]) => ({ day, ...v })),
      topContent: [...byContent.values()]
        .sort((a, b) => b.reshare - a.reshare)
        .slice(0, 20),
    };
  }

  /**
   * Lecture agrégée de l'USAGE produit sur une fenêtre : écrans vus, features
   * utilisées, contenus joués, sessions (navigateur vs PWA installée), et série
   * temporelle. Aucune donnée personnelle. Réservé admin (guard sur le contrôleur).
   */
  async usage(opts: { days?: number }): Promise<unknown> {
    const days = Math.min(Math.max(1, Math.floor(opts.days ?? 30)), 365);
    const from = this.daysAgoUtc(days);

    const rows = await this.prisma.analyticsCounter.findMany({
      where: {
        day: { gte: from },
        event: {
          in: ['screen_view', 'feature_use', 'play', 'session_start'],
        },
      },
    });

    const screens: Record<string, number> = {};
    const features: Record<string, number> = {};
    const sessions: Record<string, number> = {};
    const played = new Map<string, { refType: string; refId: string; count: number }>();
    const byDay = new Map<
      string,
      { screen_view: number; feature_use: number; play: number; session_start: number }
    >();

    for (const r of rows) {
      switch (r.event) {
        case 'screen_view':
          screens[r.refId] = (screens[r.refId] ?? 0) + r.count;
          break;
        case 'feature_use':
          features[r.refId] = (features[r.refId] ?? 0) + r.count;
          break;
        case 'session_start':
          sessions[r.refId] = (sessions[r.refId] ?? 0) + r.count;
          break;
        case 'play': {
          const k = `${r.refType}:${r.refId}`;
          const p =
            played.get(k) ?? { refType: r.refType, refId: r.refId, count: 0 };
          p.count += r.count;
          played.set(k, p);
          break;
        }
        default:
          continue;
      }

      const dayKey = r.day.toISOString().slice(0, 10);
      const d =
        byDay.get(dayKey) ??
        { screen_view: 0, feature_use: 0, play: 0, session_start: 0 };
      if (
        r.event === 'screen_view' ||
        r.event === 'feature_use' ||
        r.event === 'play' ||
        r.event === 'session_start'
      ) {
        d[r.event] += r.count;
      }
      byDay.set(dayKey, d);
    }

    const sortDesc = (rec: Record<string, number>) =>
      Object.entries(rec)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

    const sessionsTotal = Object.values(sessions).reduce((s, n) => s + n, 0);

    return {
      window: {
        days,
        from: from.toISOString().slice(0, 10),
        to: this.todayUtc().toISOString().slice(0, 10),
      },
      screens: sortDesc(screens),
      features: sortDesc(features),
      topPlayed: [...played.values()].sort((a, b) => b.count - a.count).slice(0, 20),
      sessions: {
        total: sessionsTotal,
        browser: sessions['browser'] ?? 0,
        installed: sessions['installed'] ?? 0,
        installedRate:
          sessionsTotal
            ? Math.round(((sessions['installed'] ?? 0) / sessionsTotal) * 1000) / 1000
            : 0,
      },
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, v]) => ({ day, ...v })),
    };
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
