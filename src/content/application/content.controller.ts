import { Controller, Get, Logger, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ContentService } from './content.service';
import { GetLastContentPaginatedQuery } from './queries/get-last-content-paginated/get-last-content-paginated.query';

@Controller('content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);
  constructor(private contentService: ContentService,
    private readonly queryBus: QueryBus) { }

  @Get('/last')
  getLastContent(@Query('page', ParseIntPipe) page?: number, @Query('size', ParseIntPipe) size?: number) {
    return this.queryBus.execute(new GetLastContentPaginatedQuery(page, size));
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
    @Param('page') page: string,
  ) {
    return this.contentService.findPageByMediaKey(mediaKey, parseInt(page, 10));
  }

  @Get('init/:mediaKey')
  initializeMedia(@Param('mediaKey') mediaKey: string) {
    this.logger.log('Initialisation du media : ' + mediaKey);
    this.contentService.initMediaContent(mediaKey).subscribe();
  }
}
