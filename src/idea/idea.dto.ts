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
