import {
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RequestedPageValueType } from '../../core/page-number.value-type';
import { ContentService } from './content.service';
import { GetLastContentPaginatedQuery } from './queries/get-last-content-paginated/get-last-content-paginated.query';
import { SearchedContentTermValueType } from './queries/get-last-content-paginated/searched-content-term.value-type';
import { GetShareableContentQuery } from './queries/get-shareable-content/get-shareable-content.query';
import { ShareableContentResponse } from './dto/shareable-content.dto';

@Controller('content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(
    private contentService: ContentService,
    private readonly queryBus: QueryBus,
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


  @Get('get-shareable-content/:id')
  getShareableContent(@Param('id', ParseIntPipe) id: number): Promise<ShareableContentResponse> {
    return this.queryBus.execute(new GetShareableContentQuery(id));
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
}
