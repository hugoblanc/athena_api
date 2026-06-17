import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Protège la lecture des compteurs (GET /analytics/funnel) par une clé admin
 * passée en header `x-analytics-key` ou query `?key=`. Comparée à
 * `ANALYTICS_ADMIN_KEY` (env). Fail-closed : si la clé n'est pas configurée,
 * l'endpoint est désactivé (503) plutôt qu'ouvert.
 */
@Injectable()
export class AnalyticsAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ANALYTICS_ADMIN_KEY;
    if (!expected) {
      throw new ServiceUnavailableException(
        'Lecture analytics désactivée (ANALYTICS_ADMIN_KEY non configurée).',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      (req.headers['x-analytics-key'] as string | undefined) ??
      (req.query['key'] as string | undefined);
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Clé analytics invalide.');
    }
    return true;
  }
}
