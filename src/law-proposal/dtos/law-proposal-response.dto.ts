import { SimplifiedData } from '../types/simplified.types';

/**
 * DTO pour un député dans les réponses API
 */
export interface DeputeDto {
  nom: string;
  groupePolitique: string;
  groupePolitiqueCode: string;
  photoUrl?: string;
  urlDepute?: string;
}

/**
 * DTO pour une proposition dans la liste (vue simplifiée pour le feed)
 */
export interface LawProposalSummaryDto {
  numero: string;
  titre: string;
  typeProposition: string;
  dateMiseEnLigne: Date;
  dateDepot?: Date;
  auteur: DeputeDto;
  coSignatairesCount: number;
  simplified?: {
    status: string;
    keyPoints?: string[];
  };
}

/**
 * DTO pour une section
 */
export interface SectionDto {
  type: string;
  titre: string;
  texte: string;
  articles?: ArticleDto[];
}

/**
 * DTO pour un article
 */
export interface ArticleDto {
  numero: string;
  titre?: string;
  texte: string;
}

/**
 * DTO pour un amendement
 */
export interface AmendementDto {
  numero: string;
  date: Date;
  auteur?: string;
  statut?: string;
  url?: string;
}

/**
 * DTO pour une proposition complète (page de détail)
 */
export interface LawProposalDetailDto {
  numero: string;
  titre: string;
  typeProposition: string;
  legislature: string;
  dateMiseEnLigne: Date;
  dateDepot?: Date;
  description?: string;
  urlDocument: string;
  urlDossierLegislatif?: string;

  auteur: DeputeDto;
  coSignataires: DeputeDto[];

  simplified?: SimplifiedData;

  sections: SectionDto[];
  amendements: AmendementDto[];
}
