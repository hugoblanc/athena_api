import { Idea } from '@prisma/client';

/** Corps de création d'une idée (POST /issues). */
export class CreateIdeaDto {
  title: string;
  body: string;
  /** ex-label GitHub. Tableau accepté pour compat mobile (`labels: ['feature']`). */
  type?: string;
  labels?: string[];
}

/**
 * Forme renvoyée au front. Volontairement compatible avec l'ancien contrat
 * GitHub Issue ET avec la PWA :
 * - mobile lit `number` (routing) et `comments` (compteur de votes) ;
 * - PWA lit `id`, `claps`, `title`, `body`.
 */
export interface IssueDto {
  id: number;
  number: number;
  title: string;
  body: string;
  type: string;
  status: string;
  state: 'open' | 'closed';
  voteCount: number;
  /** alias de voteCount — compat mobile (ancien `issue.comments`). */
  comments: number;
  /** alias de voteCount — compat PWA (`issue.claps`). */
  claps: number;
  labels: { name: string }[];
  created_at: string;
  updated_at: string;
}

/** Corps de création d'un commentaire (POST /issues/:id/comments). */
export class CreateCommentDto {
  text: string;
}

/** Commentaire renvoyé au front (auteur résolu, sans données sensibles). */
export interface CommentDto {
  id: number;
  text: string;
  createdAt: string;
  author: {
    displayName: string | null;
    photoUrl: string | null;
  };
}

/** Idée résumée pour la synthèse de priorisation. */
export interface PriorityItem {
  id: number;
  title: string;
  votes: number;
  type: string;
  url: string;
}

/** Réponse de `GET /issues/priorities` : que développer ensuite. */
export interface PrioritiesDto {
  totals: Record<string, number>;
  /** Demandes ouvertes les plus votées (à arbitrer), par type. */
  topFeatures: PriorityItem[];
  topBugs: PriorityItem[];
  /** Idées déjà validées (à planifier) et en cours (en chantier). */
  planned: PriorityItem[];
  inProgress: PriorityItem[];
}

/** Base URL publique de la PWA (liens vers le détail d'une idée). */
const ROADMAP_BASE_URL =
  process.env.PWA_BASE_URL?.replace(/\/$/, '') ?? 'https://www.athena-app.fr';

export function toPriorityItem(idea: {
  id: number;
  title: string;
  voteCount: number;
  type: string;
}): PriorityItem {
  return {
    id: idea.id,
    title: idea.title,
    votes: idea.voteCount,
    type: idea.type,
    url: `${ROADMAP_BASE_URL}/roadmap/${idea.id}`,
  };
}

/** Statuts considérés comme « fermés » (issue close). */
const CLOSED_STATUSES = new Set(['done', 'rejected']);

export function toIssueDto(idea: Idea): IssueDto {
  return {
    id: idea.id,
    number: idea.id,
    title: idea.title,
    body: idea.body ?? '',
    type: idea.type,
    status: idea.status,
    state: CLOSED_STATUSES.has(idea.status) ? 'closed' : 'open',
    voteCount: idea.voteCount,
    comments: idea.voteCount,
    claps: idea.voteCount,
    labels: [{ name: idea.type }],
    created_at: idea.createdAt.toISOString(),
    updated_at: idea.updatedAt.toISOString(),
  };
}
