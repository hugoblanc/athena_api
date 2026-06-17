import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as geoip from 'geoip-lite';

/**
 * Log une ligne concise par requête HTTP, avec le **pays** déduit de l'IP
 * (geoip-lite, base locale, aucune requête externe). Permet de repérer dans les
 * logs CapRover d'où vient le trafic (ex. pic d'installs depuis l'Iran → `IR`).
 *
 * Désactivable sans changer le code : `REQUEST_LOG=off` (App Configs CapRover).
 * Format : `<PAYS> <MÉTHODE> <URL> <STATUS> <ms> ip=<ip> ua="<ua>"`.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly enabled = process.env.REQUEST_LOG !== 'off';

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled) {
      next();
      return;
    }

    const start = Date.now();
    const ip = this.resolveIp(req);
    const geo = ip !== 'unknown' ? geoip.lookup(ip) : null;
    const country = geo?.country ?? '??';

    res.on('finish', () => {
      const ms = Date.now() - start;
      const ua =
        (req.headers['user-agent'] as string | undefined)?.slice(0, 90) ?? '-';
      this.logger.log(
        `${country} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ip=${ip} ua="${ua}"`,
      );
    });

    next();
  }

  /** IP réelle derrière le proxy CapRover (x-forwarded-for), sinon req.ip. */
  private resolveIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  }
}
