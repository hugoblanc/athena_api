import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ContentService } from './content.service';
import { get } from 'https';
import { YoutubeFeed } from '../core/configuration/pubsubhub/youtube-feed';

@Controller('content')
export class ContentController {
  private readonly logger = new Logger('Content Controller');
  constructor(private contentService: ContentService) { }

  // @Get('/test')
  // async testDealWith() {
  //   const youtubeFeed = new YoutubeFeed();
  //   youtubeFeed.id = 'J3bIM17IZaY';
  //   youtubeFeed.metaMediaId = 'UCVeMw72tepFl1Zt5fvf9QKQ';
  //   youtubeFeed.feed = null;

  //   await this.contentService.dealWithAtomFeed(youtubeFeed);
  // }

  @Get('/:id')
  getById(@Param('id') id: number) {
    return this.contentService.findById(id);
  }

  @Get('/mediakey/:mediaKey')
  getAllByMediaKey(@Param('mediaKey') mediaKey: string) {
    return this.contentService.findByMediaKey(mediaKey);
  }

  @Get('init/:mediaKey')
  initializeMedia(@Param('mediaKey') mediaKey: string) {
    this.logger.log('Initialisation du media : ' + mediaKey);
    this.contentService.initMediaContent(mediaKey).subscribe((data) => {
    });
  }

}
