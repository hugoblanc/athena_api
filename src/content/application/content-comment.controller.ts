import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser, OptionalAuth } from '../../auth/infrastructure/decorators';
import { CreateCommentDto } from '../../idea/idea.dto';
import { ContentCommentService } from './content-comment.service';

/**
 * Commentaires sous un article. Contrôleur distinct du `ContentController`
 * (qui est `@Public()` — l'auth y serait ignorée) : ici `@OptionalAuth()` pour
 * résoudre l'utilisateur quand un Bearer est fourni. Même préfixe `content`,
 * routes non conflictuelles (`/:id/comments`).
 */
@OptionalAuth()
@Controller('content')
export class ContentCommentController {
  constructor(private readonly commentService: ContentCommentService) {}

  /** Liste publique des commentaires d'un article. Authentifié → `isMine` posé. */
  @Get(':id/comments')
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: User) {
    return this.commentService.list(id, user?.id);
  }

  /** Poste un commentaire — connexion requise (la lecture reste publique). */
  @Post(':id/comments')
  add(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user?: User,
  ) {
    if (!user) {
      throw new UnauthorizedException('Connexion requise pour commenter');
    }
    return this.commentService.add(id, user.id, dto.text);
  }

  /** Supprime un de ses propres commentaires. */
  @Delete(':id/comments/:commentId')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user?: User,
  ) {
    if (!user) {
      throw new UnauthorizedException('Connexion requise');
    }
    return this.commentService.remove(id, commentId, user.id);
  }
}
