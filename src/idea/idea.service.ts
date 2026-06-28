import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
   * Where "plat" identifiant la ligne de vote d'un votant (user OU clé anonyme).
   * null si aucune identité (ancien client mobile, invité sans clé).
   */
  private voterWhere(
    ideaId: number,
    voter: VoterIdentity,
  ): { ideaId: number; userId: number } | { ideaId: number; anonKey: string } | null {
    if (voter.userId != null) {
      return { ideaId, userId: voter.userId };
    }
    if (voter.anonKey) {
      return { ideaId, anonKey: voter.anonKey };
    }
    return null;
  }

  /** Vérifie l'existence de l'idée (404 sinon). */
  private async assertIdeaExists(ideaId: number): Promise<void> {
    const exists = await this.prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Idée ${ideaId} introuvable`);
    }
  }

  /**
   * Enregistre un vote POUR (clap, +1) avec dédup serveur.
   * - pas de vote existant → crée value=+1, voteCount += 1.
   * - vote CONTRE existant (value=-1) → bascule en +1, voteCount += 2.
   * - vote POUR déjà présent → no-op.
   */
  async vote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    await this.assertIdeaExists(ideaId);

    const where = this.voterWhere(ideaId, voter);

    // Sans identité (ancien client mobile, invité sans clé) : comportement legacy
    // — on incrémente sans dédup serveur, l'anti-double-vote reste côté client.
    if (!where) {
      await this.prisma.$transaction([
        this.prisma.ideaVote.create({
          data: { ideaId, userId: null, anonKey: null, value: 1 },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
      return this.getOne(ideaId);
    }

    const existing = await this.prisma.ideaVote.findFirst({
      where,
      select: { id: true, value: true },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.ideaVote.create({
          data: {
            ideaId,
            userId: voter.userId ?? null,
            anonKey: voter.userId != null ? null : voter.anonKey,
            value: 1,
          },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
    } else if (existing.value === -1) {
      // Bascule contre → pour : +1 (retrait du -1) +1 (ajout du +1) = +2.
      await this.prisma.$transaction([
        this.prisma.ideaVote.update({
          where: { id: existing.id },
          data: { value: 1 },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { increment: 2 } },
        }),
      ]);
    } else {
      this.logger.debug(`Vote POUR déjà enregistré pour l'idée ${ideaId}`);
    }

    return this.getOne(ideaId);
  }

  /**
   * Retire le vote POUR d'un votant identifié (toggle "unlike"). Ne touche
   * qu'aux lignes value=+1 (un vote CONTRE se retire via undownvote).
   * No-op si aucun vote POUR correspondant.
   */
  async unvote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    const where = this.voterWhere(ideaId, voter);
    if (!where) {
      throw new BadRequestException('Identité de votant manquante');
    }

    const deleted = await this.prisma.ideaVote.deleteMany({
      where: { ...where, value: 1 },
    });
    if (deleted.count > 0) {
      await this.prisma.idea.update({
        where: { id: ideaId },
        data: { voteCount: { decrement: 1 } },
      });
    } else {
      this.logger.debug(`Aucun vote POUR à retirer pour l'idée ${ideaId}`);
    }

    return this.getOne(ideaId);
  }

  /**
   * Enregistre un vote CONTRE (-1). RÉSERVÉ aux comptes connectés (garde-fou
   * anti-sabotage, le clap étant anonyme).
   * - pas de vote existant → crée value=-1, voteCount -= 1.
   * - vote POUR existant (value=+1) → bascule en -1, voteCount -= 2.
   * - vote CONTRE déjà présent → no-op.
   */
  async downvote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    if (voter.userId == null) {
      throw new UnauthorizedException('Connexion requise pour voter contre');
    }
    await this.assertIdeaExists(ideaId);

    const existing = await this.prisma.ideaVote.findFirst({
      where: { ideaId, userId: voter.userId },
      select: { id: true, value: true },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.ideaVote.create({
          data: { ideaId, userId: voter.userId, anonKey: null, value: -1 },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { decrement: 1 } },
        }),
      ]);
    } else if (existing.value === 1) {
      // Bascule pour → contre : -1 (retrait du +1) -1 (ajout du -1) = -2.
      await this.prisma.$transaction([
        this.prisma.ideaVote.update({
          where: { id: existing.id },
          data: { value: -1 },
        }),
        this.prisma.idea.update({
          where: { id: ideaId },
          data: { voteCount: { decrement: 2 } },
        }),
      ]);
    } else {
      this.logger.debug(`Vote CONTRE déjà enregistré pour l'idée ${ideaId}`);
    }

    return this.getOne(ideaId);
  }

  /**
   * Retire le vote CONTRE d'un votant connecté (toggle). Ne touche qu'aux
   * lignes value=-1. No-op si aucun vote CONTRE correspondant.
   */
  async undownvote(ideaId: number, voter: VoterIdentity): Promise<IssueDto> {
    if (voter.userId == null) {
      throw new UnauthorizedException('Connexion requise pour voter contre');
    }

    const deleted = await this.prisma.ideaVote.deleteMany({
      where: { ideaId, userId: voter.userId, value: -1 },
    });
    if (deleted.count > 0) {
      await this.prisma.idea.update({
        where: { id: ideaId },
        data: { voteCount: { increment: 1 } },
      });
    } else {
      this.logger.debug(`Aucun vote CONTRE à retirer pour l'idée ${ideaId}`);
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
