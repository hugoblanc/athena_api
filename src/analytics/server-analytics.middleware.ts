import { Injectable, NestMiddleware } from '@nestjs/common';
import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { classifyPlatform, resolveClientIp } from './client-platform';

/**
 * Mesure l'usage AGRÉGÉ par plateforme (app native / PWA / webapp) directement
 * côté serveur, à partir du referer + user-agent de chaque requête API. Permet
 * de monitorer l'app mobile SANS instrumentation côté client (donc sans release
 * stores), et de comparer les plateformes au même endroit.
 *
 * Confidentialité (mêmes garanties que le reste du pipeline) :
 * - On n'écrit qu'un compteur agrégé `session_start` (refType=`platform`), jamais
 *   de ligne par visiteur ni d'IP.
 * - Dédup « 1 actif / plateforme / jour » via une empreinte SHA-256 non
 *   réversible (IP + UA + jour + sel) gardée seulement en mémoire pour la
 *   journée, jamais persistée.
 * - `DNT: 1` respecté. Désactivable via `SERVER_ANALYTICS=off`.
 *
 * Approximation assumée : actifs/jour ≈ empreintes distinctes (l'IP peut tourner ;
 * un redémarrage du process remet le set à zéro → léger sur-comptage). Suffisant
 * pour une tendance, pas une métrique exacte d'utilisateurs uniques.
 */
@Injectable()
export class ServerAnalyticsMiddleware implements NestMiddleware {
  private readonly enabled = process.env.SERVER_ANALYTICS !== 'off';
  private readonly salt = process.env.ANALYTICS_FP_SALT ?? '';
  private seenToday = new Set<string>();
  private currentDay = '';

  constructor(private readonly analytics: AnalyticsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled || req.headers['dnt'] === '1') {
      next();
      return;
    }

    // Capturer les en-têtes maintenant ; comptabiliser après la réponse pour ne
    // jamais ajouter de latence au parcours utilisateur.
    const referer = (req.headers['referer'] as string | undefined) ?? '';
    const ua = (req.headers['user-agent'] as string | undefined) ?? '';
    const ip = resolveClientIp(req);

    res.on('finish', () => {
      try {
        const platform = classifyPlatform(referer, ua);
        if (!platform) {
          return;
        }

        const day = new Date().toISOString().slice(0, 10);
        if (day !== this.currentDay) {
          this.currentDay = day;
          this.seenToday.clear();
        }

        const fingerprint = createHash('sha256')
          .update(`${ip}|${ua}|${day}|${this.salt}`)
          .digest('hex')
          .slice(0, 16);
        const key = `${platform}:${fingerprint}`;
        if (this.seenToday.has(key)) {
          return;
        }
        this.seenToday.add(key);

        void this.analytics.record({
          event: 'session_start',
          refType: 'platform',
          refId: platform,
        });
      } catch {
        // Un compteur ne doit jamais impacter une requête.
      }
    });

    next();
  }
}
