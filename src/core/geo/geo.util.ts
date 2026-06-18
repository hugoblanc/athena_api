import { Request } from 'express';
import * as geoip from 'geoip-lite';

/**
 * Utilitaires de géolocalisation serveur (geoip-lite, base locale, aucun appel
 * externe). L'IP réelle est lue derrière le proxy CapRover (`x-forwarded-for`)
 * et ne sert qu'à dériver un code pays — elle n'est ni loggée ni persistée ici.
 */

/** IP réelle du client derrière le proxy (premier hop de `x-forwarded-for`), sinon `req.ip`. */
export function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/** Code pays ISO-2 (ex. `IR`) déduit de l'IP, ou `null` si introuvable. */
export function resolveCountry(req: Request): string | null {
  const ip = resolveClientIp(req);
  if (ip === 'unknown') return null;
  return geoip.lookup(ip)?.country ?? null;
}
