/**
 * Codes des groupes politiques de l'Assemblée Nationale
 */
export enum GroupePolitiqueCode {
  RN = 'RN',
  LFI_NFP = 'LFI_NFP',
  SOC = 'SOC',
  ECO = 'ECO',
  GDR = 'GDR',
  EPR = 'EPR',
  DEM = 'DEM',
  HOR = 'HOR',
  DR = 'DR',
  UDR = 'UDR',
  NI = 'NI',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Mapping entre codes et noms complets des groupes politiques
 */
export const GROUPES_POLITIQUES: Record<GroupePolitiqueCode, string> = {
  [GroupePolitiqueCode.RN]: 'Rassemblement National',
  [GroupePolitiqueCode.LFI_NFP]: 'La France insoumise - Nouveau Front Populaire',
  [GroupePolitiqueCode.SOC]: 'Socialistes et apparentés',
  [GroupePolitiqueCode.ECO]: 'Écologiste et Social',
  [GroupePolitiqueCode.GDR]: 'Gauche Démocrate et Républicaine',
  [GroupePolitiqueCode.EPR]: 'Ensemble pour la République',
  [GroupePolitiqueCode.DEM]: 'Les Démocrates',
  [GroupePolitiqueCode.HOR]: 'Horizons et apparentés',
  [GroupePolitiqueCode.DR]: 'Droite Républicaine',
  [GroupePolitiqueCode.UDR]: 'Union des droites pour la République',
  [GroupePolitiqueCode.NI]: 'Non inscrit',
  [GroupePolitiqueCode.UNKNOWN]: 'Non spécifié',
};

/**
 * Normalise le nom d'un groupe politique pour trouver son code
 */
export function normalizeGroupePolitique(nomGroupe: string): GroupePolitiqueCode {
  const normalized = nomGroupe.toLowerCase().trim();

  // Mapping par mots-clés
  if (normalized.includes('rassemblement national')) return GroupePolitiqueCode.RN;
  if (normalized.includes('france insoumise') || normalized.includes('nouveau front populaire')) return GroupePolitiqueCode.LFI_NFP;
  if (normalized.includes('socialiste')) return GroupePolitiqueCode.SOC;
  if (normalized.includes('écologiste') || normalized.includes('ecologiste')) return GroupePolitiqueCode.ECO;
  if (normalized.includes('gauche démocrate') || normalized.includes('gauche democrate')) return GroupePolitiqueCode.GDR;
  if (normalized.includes('ensemble pour la république') || normalized.includes('renaissance')) return GroupePolitiqueCode.EPR;
  if (normalized.includes('démocrate') || normalized.includes('democrate') || normalized.includes('modem')) return GroupePolitiqueCode.DEM;
  if (normalized.includes('horizons')) return GroupePolitiqueCode.HOR;
  if (normalized.includes('droite républicaine') || normalized.includes('droite republicaine')) return GroupePolitiqueCode.DR;
  if (normalized.includes('union des droites')) return GroupePolitiqueCode.UDR;
  if (normalized.includes('non inscrit')) return GroupePolitiqueCode.NI;

  return GroupePolitiqueCode.UNKNOWN;
}

export interface Depute {
  nom: string;
  groupePolitique: string;
  groupePolitiqueCode?: GroupePolitiqueCode;
  photoUrl?: string;
  urlDepute?: string;
  acteurRef?: string;
}

export interface Article {
  numero: string;
  titre?: string;
  texte: string;
}

export interface Section {
  type: 'expose_motifs' | 'articles' | 'sommaire' | 'autre';
  titre: string;
  texte: string;
  articles?: Article[];
}

export interface Amendement {
  numero: string;
  date: string;
  auteur?: string;
  statut?: string;
  url?: string;
}

export interface PropositionLoi {
  numero: string;
  titre: string;
  legislature: string;
  typeProposition: string;
  dateMiseEnLigne: string;
  dateDepot?: string;
  auteur: Depute;
  coSignataires?: Depute[];
  sections: Section[];
  description?: string;
  amendements?: Amendement[];
  urlDocument: string;
  urlDossierLegislatif?: string;
  dateScraping: string;
  version: string;
}

export interface PropositionResume {
  titre: string;
  numero: string;
  date?: string;
  auteurs?: string;
  url: string;
}
