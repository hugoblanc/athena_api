import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Events de la growth loop (partage) + events d'usage produit.
 * `screen_view` / `feature_use` / `play` / `session_start` mesurent comment les
 * gens utilisent la PWA, toujours de façon AGRÉGÉE et sans donnée personnelle.
 */
export const ANALYTICS_EVENTS = [
  // Growth loop (partage)
  'preview_view',
  'value_reached',
  'reshare',
  'install',
  // Usage produit
  'screen_view',
  'feature_use',
  'play',
  'session_start',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_REF_TYPES = [
  // Catalogue (refId = identifiant libre, borné par le catalogue)
  'content',
  'law',
  'podcast',
  'qa',
  // Dimensions d'usage (refId = valeur d'une allowlist, voir ci-dessous)
  'screen',
  'feature',
  'session',
] as const;
export type AnalyticsRefType = (typeof ANALYTICS_REF_TYPES)[number];

/**
 * Allowlists des `refId` pour les dimensions d'usage. Garde-fou cardinalité :
 * la table reste bornée et un bug/abus client ne peut pas créer de lignes
 * arbitraires. Tout `refId` hors liste pour ces dimensions est ignoré.
 */
export const ANALYTICS_SCREENS = [
  'feed', // /
  'qa', // /qa
  'laws', // /propositions
  'law_detail', // /propositions/[numero]
  'content_detail', // /content/[key]/[id]
  'podcasts', // /podcasts
  'podcast_detail', // /podcasts/[id]
  'media', // /medias, /medias/[key]
  'profile', // /profile
  'installer', // /installer
  'share', // /share/...
  'auth', // /login, /register
  'info', // /informations, /roadmap, /evolution, /privacy
] as const;

export const ANALYTICS_FEATURES = [
  'search',
  'filter',
  'theme_toggle',
  'qa_ask',
  'notif_enable',
  'notif_disable',
  'media_subscribe',
  'load_more',
  'share_open',
  'player_play',
  'player_speed',
  'player_seek',
  'add_to_home',
] as const;

export const ANALYTICS_SESSIONS = ['browser', 'installed'] as const;

/** refId valides par dimension (refType ∈ {screen, feature, session}). */
export const ANALYTICS_DIMENSION_VALUES: Record<string, readonly string[]> = {
  screen: ANALYTICS_SCREENS,
  feature: ANALYTICS_FEATURES,
  session: ANALYTICS_SESSIONS,
};

/**
 * Vrai si (refType, refId) est accepté. Pour les dimensions d'usage, `refId`
 * doit appartenir à l'allowlist. Pour le catalogue, tout `refId` non vide passe.
 */
export function isAllowedRef(refType: string, refId: string): boolean {
  const allow = ANALYTICS_DIMENSION_VALUES[refType];
  if (allow) {
    return (allow as readonly string[]).includes(refId);
  }
  return refId.length > 0;
}

/**
 * Payload public (growth loop + usage). Aucune donnée personnelle ne doit transiter ici :
 * `dayHash` sert uniquement à la déduplication courte en mémoire et n'est JAMAIS persisté.
 */
export class CreateAnalyticsEventDto {
  @IsIn(ANALYTICS_EVENTS)
  event: AnalyticsEvent;

  @IsIn(ANALYTICS_REF_TYPES)
  refType: AnalyticsRefType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refId: string;

  /** Canal d'origine (app | landing | whatsapp | telegram | x | mailto | copy | ...). */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  ref?: string;

  /** Hash opaque côté client pour la dédup courte. Jamais stocké, jamais loggé. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dayHash?: string;
}
