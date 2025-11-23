import {
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RequestedPageValueType } from '../../core/page-number.value-type';
import { ExtractSpeechForContentCommand } from './commands/extract-speech-for-content.command';
import { GenerateMissingAudiosCommand } from './commands/generate-missing-audios.command';
import { ContentService } from './content.service';
import { ShareableContentResponse } from './dto/shareable-content.dto';
import { GetAudioContentUrlByIdQuery } from './queries/get-audio-content-url-by-id/get-audio-content-url-by-id.query';
import { GetLastContentPaginatedQuery } from './queries/get-last-content-paginated/get-last-content-paginated.query';
import { SearchedContentTermValueType } from './queries/get-last-content-paginated/searched-content-term.value-type';
import { GetShareableContentQuery } from './queries/get-shareable-content/get-shareable-content.query';
import { GetIdFromContentIdAndKeyQuery } from './queries/get-id-from-content-id-and-media-key/get-id-from-content-id-and-media-key.query';
import { Content } from '../domain/content.entity';

@Controller('content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(
    private contentService: ContentService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus
  ) { }

  @Get('/last')
  getLastContent(
    @Query('page', ParseIntPipe) page: number,
    @Query('size', ParseIntPipe) size: number,
    @Query('terms') terms?: string,
  ) {
    return this.queryBus.execute(
      new GetLastContentPaginatedQuery(
        new RequestedPageValueType(page, size),
        new SearchedContentTermValueType(terms),
      ),
    );
  }


  @Get('get-shareable-content/:key/:contentId')
  getShareableContent(@Param('key') key: string, @Param('contentId') contentId: string): Promise<ShareableContentResponse> {
    return this.queryBus.execute(new GetShareableContentQuery(key, contentId));
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
