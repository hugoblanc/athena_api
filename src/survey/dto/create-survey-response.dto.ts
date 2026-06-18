import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Sondages connus (allowlist : un client ne peut pas créer de campagne arbitraire). */
export const SURVEYS = ['iran'] as const;
export type Survey = (typeof SURVEYS)[number];

/** Code pays (geoip) éligible à chaque sondage. Le serveur fait foi, jamais le client. */
export const SURVEY_ELIGIBLE_COUNTRY: Record<Survey, string> = {
  iran: 'IR',
};

/**
 * Soumission d'une réponse de sondage. `survey` borné par l'allowlist ;
 * `message` requis (texte libre, jamais d'IP). `contact` optionnel pour un suivi.
 */
export class CreateSurveyResponseDto {
  @IsIn(SURVEYS)
  survey: Survey;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}
