import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator';
import { OptionalAuth } from '../auth/infrastructure/decorators/optional-auth.decorator';
import { CreateCommentDto, CreateIdeaDto } from './idea.dto';
import { IdeaService } from './idea.service';

/**
 * Roadmap / idées (ex-GitHub issues, désormais en BDD).
 *
 * Routes volontairement identiques à l'ancien contrat GitHub pour ne pas
 * casser les clients (`/issues`, `/issues/:id/clap`).
 *
 * @OptionalAuth : endpoints publics (lecture + vote en invité possible) ;
 * si un Bearer Firebase valide est fourni, l'utilisateur est dédupliqué côté
 * serveur, sinon on utilise l'entête `X-Anon-Key`.
 */
@Controller('issues')
@OptionalAuth()
export class IdeaController {
  private readonly logger = new Logger(IdeaController.name);

  constructor(private ideaService: IdeaService) {}

  @Get()
  list(@Query('labels') labels?: string) {
    // `labels` (compat GitHub) = type unique en pratique (feature|bug).
    return this.ideaService.list(labels);
  }

  /**
   * Synthèse de priorisation produit : ce qu'il faut développer ensuite, d'après
   * les votes des utilisateurs. ⚠️ Déclaré AVANT `:id` (sinon capté par la route
   * paramétrée). `?limit=` borne les listes top (défaut 15).
   */
  @Get('priorities')
  priorities(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(Number(limit) || 15, 1), 50);
    return this.ideaService.getPriorities(n);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.ideaService.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user?: User) {
    return this.ideaService.create(dto, user?.id);
  }

  @Post(':id/clap')
  clap(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
    @Headers('x-anon-key') anonKey?: string,
  ) {
    return this.ideaService.vote(id, { userId: user?.id, anonKey });
  }

  @Delete(':id/clap')
  unclap(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
    @Headers('x-anon-key') anonKey?: string,
  ) {
    return this.ideaService.unvote(id, { userId: user?.id, anonKey });
  }

  @Get(':id/comments')
  listComments(@Param('id', ParseIntPipe) id: number) {
    return this.ideaService.getComments(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user?: User,
  ) {
    // Commenter exige un compte (le vote, lui, reste anonyme).
    if (!user) {
      throw new UnauthorizedException('Connexion requise pour commenter');
    }
    return this.ideaService.addComment(id, user.id, dto.text);
  }
}
