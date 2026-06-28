import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res
} from '@nestjs/common';
import { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Public } from '../../auth/infrastructure/decorators';
import { ContentOgService } from '../og/content-og.service';
import { RequestedPageValueType } from '../../core/page-number.value-type';
import { ExtractSpeechForContentCommand } from './commands/extract-speech-for-content.command';
import { GenerateMissingAudiosCommand } from './commands/generate-missing-audios.command';
import { ContentService } from './content.service';
import { RssService } from './rss.service';
import { ShareableContentResponse } from './dto/shareable-content.dto';
import { GetAudioContentUrlByIdQuery } from './queries/get-audio-content-url-by-id/get-audio-content-url-by-id.query';
import { GetLastContentPaginatedQuery } from './queries/get-last-content-paginated/get-last-content-paginated.query';
import { MediaKeysValueType } from './queries/get-last-content-paginated/media-keys.value-type';
import { SearchedContentTermValueType } from './queries/get-last-content-paginated/searched-content-term.value-type';
import { GetShareableContentQuery } from './queries/get-shareable-content/get-shareable-content.query';
import { GetIdFromContentIdAndKeyQuery } from './queries/get-id-from-content-id-and-media-key/get-id-from-content-id-and-media-key.query';
import { Content } from '../domain/content.entity';

@Controller('content')
@Public() // Tous les endpoints de contenu sont publics (pas d'auth requise)
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(
    private contentService: ContentService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly contentOgService: ContentOgService,
    private readonly rssService: RssService
  ) { }

  @Get('/last')
  getLastContent(
    @Query('page', ParseIntPipe) page: number,
    @Query('size', ParseIntPipe) size: number,
    @Query('terms') terms?: string,
    @Query('mediaKeys') mediaKeys?: string,
  ) {
    return this.queryBus.execute(
      new GetLastContentPaginatedQuery(
        new RequestedPageValueType(page, size),
        new SearchedContentTermValueType(terms),
        new MediaKeysValueType(mediaKeys),
      ),
    );
  }


  /**
   * GET /content/rss?medias=key1,key2
   * Flux RSS 2.0 des ~30 derniers contenus (tous médias si `medias` absent,
   * sinon filtrés par metaMediaKeys). À brancher dans un lecteur RSS tiers.
   * ⚠️ Déclaré AVANT `/:id` (sinon capté par la route paramétrée).
   */
  @Get('/rss')
  async getRss(
    @Res() res: Response,
    @Query('medias') medias?: string,
  ): Promise<void> {
    const xml = await this.rssService.getFeed(medias);
    res.set({
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    });
    res.send(xml);
  }

  @Get('get-shareable-content/:key/:contentId')
  getShareableContent(@Param('key') key: string, @Param('contentId') contentId: string): Promise<ShareableContentResponse> {
    return this.queryBus.execute(new GetShareableContentQuery(key, contentId));
  }

  /**
   * GET /content/:key/:contentId/og.png
   * Image Open Graph (1200x630) brandée du contenu. Servie depuis le cache
   * (volume) ou générée à la volée au premier accès (premier partage/crawl).
   * Cache HTTP long côté CDN/navigateur.
   */
  @Get(':key/:contentId/og.png')
  async getOgImage(
    @Param('key') key: string,
    @Param('contentId') contentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const png = await this.contentOgService.getOrGenerate(key, contentId);
    if (!png) {
      res.status(HttpStatus.NOT_FOUND).send('OG image not available');
      return;
    }
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control':
        'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    });
    res.send(png);
  }

  @Get('get-audio-content-url-by-id/:id')
  getAudioContentUrlByContentId(@Param('id', ParseIntPipe) id: number): Promise<ShareableContentResponse> {
    return this.queryBus.execute(new GetAudioContentUrlByIdQuery(id));
  }

  @Get('get-id-from-content-id-and-media-key/:key/:contentId')
  getIdFromContentIdAndMediaKey(@Param('contentId') contentId: string, @Param('key') key: string): Promise<Content> {
    return this.queryBus.execute(new GetIdFromContentIdAndKeyQuery(key, contentId));
  }


  @Get('/:id')
  getById(@Param('id') id: number) {
    return this.contentService.findById(id);
  }

  @Get('/mediakey/:mediaKey')
  getAllByMediaKey(@Param('mediaKey') mediaKey: string) {
    return this.contentService.findByMediaKey(mediaKey);
  }

  @Get('/mediakey/:mediaKey/page/:page')
  getPageByMediaKey(
    @Param('mediaKey') mediaKey: string,
    @Param('page', ParseIntPipe) page: number,
  ) {
    return this.contentService.findPageByMediaKey(mediaKey, page);
  }

  @Get('init/:mediaKey')
  initializeMedia(@Param('mediaKey') mediaKey: string) {
    this.logger.log('Initialisation du media : ' + mediaKey);
    this.contentService.initMediaContent(mediaKey).subscribe();
  }

  @Post('extract-speech/:id')
  extractSpeech(@Param('id', ParseIntPipe) id: number) {
    return this.commandBus.execute(new ExtractSpeechForContentCommand(id))
  }

  @Post('generate-missing-audios')
  async generateMissingAudios(
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    this.logger.log(`Generating missing audios (limit: ${limitNumber})`);
    return this.commandBus.execute(new GenerateMissingAudiosCommand(limitNumber));
  }


}
