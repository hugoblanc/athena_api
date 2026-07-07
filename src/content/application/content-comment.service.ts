import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../law-proposal/infrastructure/prisma.service';
import { CommentDto } from '../../idea/idea.dto';

const COMMENT_MAX = 2000;

/**
 * Commentaires sous un article (contenu). Miroir des commentaires d'idées
 * (cf. IdeaService), sur le même modèle polymorphe `Comment` (ici `contentId`).
 * Lecture publique ; écriture réservée aux comptes ; suppression limitée à
 * l'auteur du commentaire.
 */
@Injectable()
export class ContentCommentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les commentaires d'un contenu (anté-chronologique). Si `currentUserId`
   * est fourni (requête authentifiée), chaque commentaire est annoté `isMine`.
   */
  async list(contentId: number, currentUserId?: number): Promise<CommentDto[]> {
    const comments = await this.prisma.comment.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { displayName: true, photoUrl: true } } },
    });
    return comments.map((c) => ContentCommentService.toDto(c, currentUserId));
  }

  /** Ajoute un commentaire (réservé aux utilisateurs connectés). */
  async add(contentId: number, userId: number, text: string): Promise<CommentDto> {
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new BadRequestException('Le commentaire ne peut pas être vide');
    }

    const exists = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Contenu ${contentId} introuvable`);
    }

    const c = await this.prisma.comment.create({
      data: { contentId, userId, text: trimmed.slice(0, COMMENT_MAX) },
      include: { user: { select: { displayName: true, photoUrl: true } } },
    });
    // Le commentaire qu'on vient de créer appartient forcément à l'auteur.
    return ContentCommentService.toDto(c, userId);
  }

  /** Supprime un commentaire — uniquement par son auteur. */
  async remove(
    contentId: number,
    commentId: number,
    userId: number,
  ): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, contentId: true },
    });
    if (!comment || comment.contentId !== contentId) {
      throw new NotFoundException('Commentaire introuvable');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  private static toDto(
    c: {
      id: number;
      userId: number;
      text: string;
      createdAt: Date;
      user?: { displayName: string | null; photoUrl: string | null } | null;
    },
    currentUserId?: number,
  ): CommentDto {
    return {
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      author: {
        displayName: c.user?.displayName ?? null,
        photoUrl: c.user?.photoUrl ?? null,
      },
      isMine: currentUserId != null && c.userId === currentUserId,
    };
  }
}
