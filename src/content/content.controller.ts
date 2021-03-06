import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  private readonly logger = new Logger('Content Controller');
  constructor(private contentService: ContentService) { }

  @Get('/:id')
  getById(@Param('id') id: number) {
    return this.contentService.findById(id);
  }

  @Get('/mediakey/:mediaKey')
  getAllByMediaKey(@Param('mediaKey') mediaKey: string) {
    return this.contentService.findByMediaKey(mediaKey);
  }

  @Get('/mediakey/:mediaKey/page/:page')
  getPageByMediaKey(@Param('mediaKey') mediaKey: string, @Param('page') page: string) {
    return this.contentService.findPageByMediaKey(mediaKey, parseInt(page, 10));
  }

  @Get('init/:mediaKey')
  initializeMedia(@Param('mediaKey') mediaKey: string) {
    this.logger.log('Initialisation du media : ' + mediaKey);
    this.contentService.initMediaContent(mediaKey).subscribe((data) => {
    });
  }

}
