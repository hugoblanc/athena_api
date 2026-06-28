import { Request } from 'express';
import { AnalyticsPlatform } from './dto/create-analytics-event.dto';

/** Vrai pour les UA d'outils, crawlers et générateurs d'aperçus de liens. */
const BOT_UA =
  /bot\b|crawler|spider|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|linkedinbot|bingbot|googlebot|duckduckbot|yandexbot|applebot|preview|headlesschrome|python|curl|axios|go-http|okhttp|scrapy|wget|\bnode\b/i;

/**
 * Déduit la plateforme cliente d'une requête API à partir du `referer` et du
 * `user-agent` — SANS aucune instrumentation côté client.
 *
 * - App native Capacitor/Ionic : sert son origine en `https://localhost`
 *   (Android) ou `capacitor://localhost` / `ionic://localhost` (iOS). Fallback :
 *   UA WebView `; wv)` quand le referer est absent.
 * - PWA Next.js : referer sur `athena-app.xyz`.
 * - Ancienne webapp Angular : referer sur `webapp.athena-app.fr`.
 *
 * Retourne `null` pour les bots / SSR / outils (à ne pas compter comme usage).
 */
export function classifyPlatform(
  referer: string,
  userAgent: string,
): AnalyticsPlatform | null {
  const ua = userAgent.toLowerCase();
  if (!ua || BOT_UA.test(ua)) {
    return null;
  }

  const ref = referer.toLowerCase();
  const isNativeOrigin =
    ref.startsWith('https://localhost') ||
    ref.startsWith('capacitor://') ||
    ref.startsWith('ionic://');

  if (isNativeOrigin || ua.includes('; wv)')) {
    const isIos =
      ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios');
    // Une WebView `; wv)` est Android ; iOS n'expose pas `wv`.
    return isIos && !ua.includes('; wv)') ? 'ios_app' : 'android_app';
  }

  if (ref.includes('athena-app.xyz')) {
    return 'pwa';
  }
  if (ref.includes('webapp.athena-app.fr')) {
    return 'webapp';
  }
  return 'other';
}

/** IP réelle derrière le proxy CapRover (x-forwarded-for), sinon req.ip. */
export function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}
