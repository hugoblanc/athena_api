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
   * Rejoue une transaction de vote en cas de conflit attendu sous concurrence :
   * - P2034 : write conflict / deadlock (sérialisation Postgres) ;
   * - P2002 : deux créations concurrentes de la même ligne (course sur l'unique).
   * Au retry, la transaction relit l'état réel et converge (no-op ou bascule).
   */
  private async runVoteTx(fn: () => Promise<void>, attempts = 3): Promise<void> {
    for (let i = 0; ; i++) {
      try {
        await fn();
        return;
      } catch (e) {
        const retryable =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          (e.code === 'P2034' || e.code === 'P2002');
        if (retryable && i < attempts - 1) {
          this.logger.debug(`Conflit de vote (${e.code}), retry ${i + 1}`);
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * Pose le vote d'un votant IDENTIFIÉ à `value` (+1 ou -1) de façon atomique.
   * Lecture + écriture dans UNE transaction sérialisée : le delta du compteur
   * est calculé sur l'état réellement lu DANS la transaction (pas de divergence
   * sous double-clic / requêtes concurrentes).
   */
  private async applyVote(
    ideaId: number,
    voter: VoterIdentity,
    where:
      | { ideaId: number; userId: number }
      | { ideaId: number; anonKey: string },
    value: 1 | -1,
  ): Promise<void> {
    await this.runVoteTx(() =>
      this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.ideaVote.findFirst({
            where,
            select: { id: true, value: true },
          });

          if (!existing) {
            await tx.ideaVote.create({
              data: {
                ideaId,
                userId: voter.userId ?? null,
                anonKey: voter.userId != null ? null : voter.anonKey,
                value,
              },
            });
            await tx.idea.update({
              where: { id: ideaId },
              data: { voteCount: { increment: value } },
            });
            return;
          }

          if (existing.value === value) {
            // Déjà dans la bonne direction → no-op.
            return;
          }

          // Bascule : delta = nouvelle valeur - ancienne (ex. +1-(-1)=+2, -1-1=-2).
          const delta = value - existing.value;
          await tx.ideaVote.update({
            where: { id: existing.id },
            data: { value },
          });
          await tx.idea.update({
            where: { id: ideaId },
            data: { voteCount: { increment: delta } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  /**
   * Retire le vote d'un votant identifié S'IL est dans la direction `value`.
   * Lecture + suppression + maj compteur dans une transaction sérialisée ;
   * le compteur est rétabli du montant réellement supprimé (delta = -value).
   */
  private async removeVote(
    ideaId: number,
    where:
      | { ideaId: number; userId: number }
      | { ideaId: number; anonKey: string },
    value: 1 | -1,
  ): Promise<void> {
    await this.runVoteTx(() =>
      this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.ideaVote.findFirst({
            where: { ...where, value },
            select: { id: true },
          });
          if (!existing) {
            return;
          }
          await tx.ideaVote.delete({ where: { id: existing.id } });
          await tx.idea.update({
            where: { id: ideaId },
            data: { voteCount: { increment: -value } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
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
    // Pas de lecture préalable ici → pas de risque de divergence du compteur.
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

    await this.applyVote(ideaId, voter, where, 1);
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

    await this.removeVote(ideaId, where, 1);
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

    await this.applyVote(
      ideaId,
      voter,
      { ideaId, userId: voter.userId },
      -1,
    );
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

    await this.removeVote(ideaId, { ideaId, userId: voter.userId }, -1);
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
