import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Rate-limit simple en mémoire, par IP, sans dépendance externe.
 * Fenêtre glissante grossière (buckets fixes d'une minute) : 60 requêtes / minute / IP.
 *
 * L'IP n'est jamais loggée ni persistée ; elle ne sert qu'à pondérer ce compteur en RAM
 * et la Map est bornée + purgée pour éviter toute fuite mémoire.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  private static readonly LIMIT = 60;
  private static readonly WINDOW_MS = 60_000;
  private static readonly MAX_ENTRIES = 50_000;

  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.resolveIp(request);
    const now = Date.now();

    let entry = this.hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + IpRateLimitGuard.WINDOW_MS };
      this.hits.set(ip, entry);
    }

    entry.count += 1;

    if (this.hits.size > IpRateLimitGuard.MAX_ENTRIES) {
      this.purge(now);
    }

    if (entry.count > IpRateLimitGuard.LIMIT) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? 'unknown';
  }

  /** Supprime les buckets expirés ; en dernier recours, vide tout pour rester borné. */
  private purge(now: number): void {
    for (const [key, value] of this.hits) {
      if (value.resetAt <= now) {
        this.hits.delete(key);
      }
    }
    if (this.hits.size > IpRateLimitGuard.MAX_ENTRIES) {
      this.hits.clear();
    }
  }
}
