import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ANALYTICS_EVENTS = [
  'preview_view',
  'value_reached',
  'reshare',
  'install',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_REF_TYPES = [
  'content',
  'law',
  'podcast',
  'qa',
] as const;
export type AnalyticsRefType = (typeof ANALYTICS_REF_TYPES)[number];

/**
 * Payload public de la growth loop. Aucune donnée personnelle ne doit transiter ici :
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
