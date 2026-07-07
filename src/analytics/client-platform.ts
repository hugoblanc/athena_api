import { Request } from 'express';
import { AnalyticsPlatform } from './dto/create-analytics-event.dto';

/**
 * Vrai pour les UA d'outils, crawlers, scanners et générateurs d'aperçus.
 * Inclut les scanners de vulnérabilités observés en prod (`TLM-Audit-Scanner`,
 * `l9scan`...) qui ne portent aucun mot-clé bot classique et polluaient sinon
 * les buckets `desktop_web` / `mobile_web`.
 */
const BOT_UA =
  /bot\b|crawler|spider|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|linkedinbot|bingbot|googlebot|duckduckbot|yandexbot|applebot|preview|headlesschrome|python|curl|axios|go-http|okhttp|scrapy|wget|\bnode\b|scan(ner)?|audit|l9scan|masscan|nuclei|zgrab|nmap|httpx|libwww|java\/|dataforseo|semrush|dotbot|mj12|petalbot|censys|expanse|palo ?alto/i;

/**
 * Chemins jamais légitimes côté app (probes de secrets/failles). Les scanners
 * qui spoofent un vrai UA de navigateur se trahissent en les demandant : on ne
 * compte pas ces requêtes comme de l'usage.
 */
const PROBE_PATH =
  /(^|\/)\.(env|git|aws|ssh)|\/wp-(login|admin|content)|\/phpmyadmin|\/\.well-known\/(?!.*acme)|\/(vendor|app)\/\.env|\/config\.(php|json|ya?ml)$|\/actuator|\/\.DS_Store/i;

/** Vrai si le chemin demandé est un probe de scanner (à ne pas compter). */
export function isProbePath(path: string): boolean {
  return PROBE_PATH.test(path);
}

/** UA d'un terminal mobile (natif ou navigateur). */
const MOBILE_UA =
  /android|iphone|ipad|ipod|iemobile|blackberry|opera mini|windows phone|mobile safari/i;

/** Une origine (scheme://host) sert-elle l'app native Capacitor/Ionic ? */
function isNativeOrigin(value: string): boolean {
  return (
    value.startsWith('capacitor://') ||
    value.startsWith('ionic://') ||
    value.startsWith('https://localhost') ||
    value.startsWith('http://localhost')
  );
}

/**
 * Déduit la plateforme cliente d'une requête API à partir des en-têtes `origin`
 * et `referer` et du `user-agent` — SANS aucune instrumentation côté client.
 *
 * Pourquoi `origin` ET `referer` : le WebView iOS (WKWebView) envoie souvent
 * `Origin: capacitor://localhost` mais AUCUN `Referer` (contrairement à Android
 * `https://localhost`). Ne lire que le referer faisait tomber tout l'iOS natif
 * dans « other ». On regarde donc les deux.
 *
 * - App native Capacitor/Ionic : origine `https://localhost` (Android),
 *   `capacitor://localhost` (iOS), ou UA WebView `; wv)` (Android). iOS vs
 *   Android tranché par l'UA (iphone/ipad/ipod).
 * - `pwa` : origine/referer sur `athena-app.xyz`. `webapp` : `webapp.athena-app.fr`.
 * - Sinon (vrai navigateur sur une origine non connue, ou accès direct) :
 *   `mobile_web` vs `desktop_web` selon l'UA.
 *
 * Retourne `null` pour les bots / SSR / outils (à ne pas compter comme usage),
 * et `other` seulement pour un résiduel non classable (UA présente mais ni
 * mobile ni desktop identifiable).
 */
export function classifyPlatform(
  referer: string,
  userAgent: string,
  origin = '',
): AnalyticsPlatform | null {
  const ua = userAgent.toLowerCase();
  if (!ua || BOT_UA.test(ua)) {
    return null;
  }

  const ref = referer.toLowerCase();
  const org = origin.toLowerCase();

  if (isNativeOrigin(org) || isNativeOrigin(ref) || ua.includes('; wv)')) {
    const isIos =
      ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
    return isIos ? 'ios_app' : 'android_app';
  }

  if (org.includes('athena-app.xyz') || ref.includes('athena-app.xyz')) {
    return 'pwa';
  }
  if (
    org.includes('webapp.athena-app.fr') ||
    ref.includes('webapp.athena-app.fr')
  ) {
    return 'webapp';
  }

  // Vrai navigateur sur une origine non rattachée (accès direct à l'API, lien
  // partagé ouvert hors app, moteur de recherche...). On garde au moins l'axe
  // mobile/desktop plutôt qu'un fourre-tout « other ».
  if (MOBILE_UA.test(ua)) {
    return 'mobile_web';
  }
  if (ua.includes('mozilla') || ua.includes('webkit') || ua.includes('gecko')) {
    return 'desktop_web';
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
