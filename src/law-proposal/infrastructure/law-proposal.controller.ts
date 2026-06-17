import { Controller, Post, Get, Query, Logger, ParseIntPipe, Param, HttpException, HttpStatus, UsePipes, ValidationPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../auth/infrastructure/decorators';
import { LawScrapingService } from '../application/law-scraping.service';
import { LawSimplificationService } from '../application/law-simplification.service';
import { LawProposalService } from '../application/law-proposal.service';
import { LawOgService } from '../og/law-og.service';
import { ListLawProposalsQueryDto } from '../dtos/law-proposal-list.dto';

@Controller('law-proposal')
@Public()
export class LawProposalController {
  private readonly logger = new Logger(LawProposalController.name);

  constructor(
    private lawScrapingService: LawScrapingService,
    private lawSimplificationService: LawSimplificationService,
    private lawProposalService: LawProposalService,
    private lawOgService: LawOgService,
  ) {}

  /**
   * GET /law-proposal
   * Liste paginée de toutes les propositions avec filtres
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async list(@Query() query: ListLawProposalsQueryDto) {
    return await this.lawProposalService.findAllWithFilters(query);
  }

  /**
   * POST /law-proposal/initialize?limit=50
   * Initialise le scraping des X dernières propositions de loi
   */
  @Post('initialize')
  async initialize(@Query('limit') limit: string = '50') {
    const limitNum = parseInt(limit, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return {
        error: 'Invalid limit (must be between 1 and 500)',
      };
    }

    this.logger.log(`Initializing law proposals (limit: ${limitNum})`);

    const result = await this.lawScrapingService.initializeProposals(limitNum);

    // Lancer le traitement asynchrone de la queue de simplification
    this.lawSimplificationService.processQueue().catch(err =>
      this.logger.error('Simplification queue error', err),
    );

    return {
      message: 'Scraping completed, simplification in progress',
      created: result.created,
      skipped: result.skipped,
    };
  }

  /**
   * POST /law-proposal/process-simplification-queue
   * Force le traitement de la queue de simplification
   */
  @Post('process-simplification-queue')
  async processQueue(@Query('batchSize') batchSize: string = '5') {
    const batchSizeNum = parseInt(batchSize, 10);

    this.logger.log(`Processing simplification queue (batch size: ${batchSizeNum})`);

    await this.lawSimplificationService.processQueue(batchSizeNum);

    return {
      message: 'Queue processed successfully',
    };
  }

  /**
   * GET /law-proposal/stats
   * Récupère les statistiques
   */
  @Get('stats')
  async getStats() {
    const stats = await this.lawProposalService.getStats();
    return stats;
  }

  /**
   * GET /law-proposal/recent?limit=10
   * Récupère les propositions récentes
   */
  @Get('recent')
  async getRecent(@Query('limit') limit: string = '10') {
    const limitNum = parseInt(limit, 10) || 10;
    const proposals = await this.lawProposalService.findRecent(limitNum);

    return {
      data: proposals,
      count: proposals.length,
    };
  }

  /**
   * GET /law-proposal/:numero/og.png
   * Image Open Graph (1200x630) de la loi. Servie depuis le cache (volume) ou
   * générée à la volée au premier accès. Cache HTTP long côté CDN/navigateur.
   */
  @Get(':numero/og.png')
  async getOgImage(
    @Param('numero') numero: string,
    @Res() res: Response,
  ): Promise<void> {
    const png = await this.lawOgService.getOrGenerate(numero);
    if (!png) {
      res.status(HttpStatus.NOT_FOUND).send('OG image not available');
      return;
    }
    res.set({
      'Content-Type': 'image/png',
      // Immutable côté clients/CDN ; régénérée seulement si on supprime le fichier.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    });
    res.send(png);
  }

  /**
   * GET /law-proposal/:numero
   * Récupère une proposition par son numéro
   */
  @Get(':numero')
  async getByNumero(@Param('numero') numero: string) {
    const proposal = await this.lawProposalService.findByNumero(numero);

    if (!proposal) {
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }

    return proposal;
  }
}
