import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import {
  CommentDto,
  CreateIdeaDto,
  IssueDto,
  PrioritiesDto,
  toIssueDto,
  toPriorityItem,
} from './idea.dto';

/** Identité d'un votant pour la dédup serveur (cf. IdeaVote). */
export interface VoterIdentity {
  userId?: number;
  anonKey?: string;
}

@Injectable()
export class IdeaService {
  private readonly logger = new Logger(IdeaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Liste les idées, optionnellement filtrées par type (feature|media|bug).
   * Cap large (la roadmap est une liste finie ~quelques centaines d'items) :
   * on renvoie tout, le regroupement/tri se fait côté front.
   */
  async list(type?: string): Promise<IssueDto[]> {
    const ideas = await this.prisma.idea.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
    });
    return ideas.map(toIssueDto);
  }

  /**
   * Synthèse de priorisation : que développer ensuite d'après les votes.
   * - topFeatures / topBugs : demandes OUVERTES les plus votées (à arbitrer).
   * - planned / inProgress : déjà validées / en chantier.
   */
  async getPriorities(limit: number): Promise<PrioritiesDto> {
    const select = {
      id: true,
      title: true,
      voteCount: true,
      type: true,
    } as const;
    const byVotes = [
      { voteCount: 'desc' as const },
      { createdAt: 'desc' as const },
    ];

    const [grouped, topFeatures, topBugs, planned, inProgress] =
      await Promise.all([
        this.prisma.idea.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.idea.findMany({
          where: { status: 'open', type: 'feature' },
          orderBy: byVotes,
          take: limit,
          select,
        }),
        this.prisma.idea.findMany({
          where: { status: 'open', type: 'bug' },
          orderBy: byVotes,
          take: Math.ceil(limit / 2),
          select,
        }),
        this.prisma.idea.findMany({
          where: { status: 'planned' },
          orderBy: byVotes,
          take: limit,
          select,
        }),
        this.prisma.idea.findMany({
          where: { status: 'in_progress' },
          orderBy: byVotes,
          take: limit,
          select,
        }),
      ]);

    const totals: Record<string, number> = {};
    for (const g of grouped) totals[g.status] = g._count._all;

    return {
      totals,
      topFeatures: topFeatures.map(toPriorityItem),
      topBugs: topBugs.map(toPriorityItem),
      planned: planned.map(toPriorityItem),
      inProgress: inProgress.map(toPriorityItem),
    };
  }

  async getOne(id: number): Promise<IssueDto> {
    const idea = await this.prisma.idea.findUnique({ where: { id } });
    if (!idea) {
      throw new NotFoundException(`Idée ${id} introuvable`);
    }
    return toIssueDto(idea);
  }

  async create(dto: CreateIdeaDto, authorId?: number): Promise<IssueDto> {
    const title = dto.title?.trim();
    const body = dto.body?.trim() ?? '';

    if (!title || title.length < 2) {
      throw new BadRequestException('Le titre ne peut pas être vide');
    }

    // Compat mobile : le type arrive via `labels: ['feature']`.
    const type = dto.type ?? dto.labels?.[0] ?? 'feature';

    const idea = await this.prisma.idea.create({
      data: { title, body, type, authorId: authorId ?? null },
    });
    this.logger.log(`Idée créée #${idea.id} (${type})`);
    return toIssueDto(idea);
  }

  /**
   * Enregistre un vote (clap) avec dédup serveur. Si le votant a déjà voté
   * (contrainte unique), on ignore silencieusement et on renvoie l'état courant.
   */
  async vote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    const exists = await this.prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Idée ${ideaId} introuvable`);
    }

    // Dédup serveur seulement si le votant est identifié (user OU clé anonyme).
    // Sans identité (ancien client mobile, invité sans clé) : comportement legacy
    // — on incrémente quand même, l'anti-double-vote reste côté client (localStorage).
    try {
      await this.prisma.$transaction([
        this.prisma.ideaVote.create({
          data: {
            ideaId,
            userId: voter.userId ?? null,
            anonKey: voter.userId != null ? null : voter.anonKey,
          },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
    } catch (e) {
      // P2002 = violation de contrainte unique → déjà voté, on ne fait rien.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        this.logger.debug(`Vote déjà enregistré pour l'idée ${ideaId}`);
      } else {
        throw e;
      }
    }

    return this.getOne(ideaId);
  }

  /**
   * Retire le vote d'un votant identifié (toggle "unlike"). Supprime sa ligne
   * IdeaVote et décrémente le compteur. No-op si aucun vote correspondant.
   */
  async unvote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    const where =
      voter.userId != null
        ? { ideaId_userId: { ideaId, userId: voter.userId } }
        : voter.anonKey
          ? { ideaId_anonKey: { ideaId, anonKey: voter.anonKey } }
          : null;

    if (!where) {
      throw new BadRequestException('Identité de votant manquante');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.ideaVote.delete({ where }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { decrement: 1 } },
        }),
      ]);
    } catch (e) {
      // P2025 = ligne absente → pas de vote à retirer, on ignore.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        this.logger.debug(`Aucun vote à retirer pour l'idée ${ideaId}`);
      } else {
        throw e;
      }
    }

    return this.getOne(ideaId);
  }

  /** Liste les commentaires d'une idée (anté-chronologique : plus récents en premier). */
  async getComments(ideaId: number): Promise<CommentDto[]> {
    const comments = await this.prisma.comment.findMany({
      where: { ideaId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { displayName: true, photoUrl: true } } },
    });
    return comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      author: {
        displayName: c.user?.displayName ?? null,
        photoUrl: c.user?.photoUrl ?? null,
      },
    }));
  }

  /** Ajoute un commentaire (réservé aux utilisateurs connectés). */
  async addComment(
    ideaId: number,
    userId: number,
    text: string,
  ): Promise<CommentDto> {
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new BadRequestException('Le commentaire ne peut pas être vide');
    }

    const exists = await this.prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Idée ${ideaId} introuvable`);
    }

    const c = await this.prisma.comment.create({
      data: { ideaId, userId, text: trimmed.slice(0, 2000) },
      include: { user: { select: { displayName: true, photoUrl: true } } },
    });
    return {
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      author: {
        displayName: c.user?.displayName ?? null,
        photoUrl: c.user?.photoUrl ?? null,
      },
    };
  }
}
