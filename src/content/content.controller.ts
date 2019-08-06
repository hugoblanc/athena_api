import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {

  constructor(private contentService: ContentService) { }

  @Get('init/:mediaKey')
  initializeMedia(@Param('mediaKey') mediaKey: string) {
    this.contentService.initMediaContent(mediaKey).subscribe((data) => {
      console.log(data);
    });
  }
}
