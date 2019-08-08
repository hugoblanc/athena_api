import { Injectable, Logger } from '@nestjs/common';
import { ContentService } from '../../../content/content.service';
import { FormatService } from '../../../helper/format/format.service';
import { IConfigurationService } from '../iconfiguration-service';
import { PubSub } from './pubsub';
import { YoutubeFeed } from './youtube-feed';

@Injectable()
export class PubsubhubService implements IConfigurationService {

  private readonly logger = new Logger(PubsubhubService.name);

  constructor(private contentService: ContentService) {

  }

  init() {
    const pubServer = new PubSub();
    const youtubeFeed$ = pubServer.init();
    this.logger.log('subscribe');
    youtubeFeed$.subscribe((youtubeFeedXML: string) => {
      FormatService.decodeXML(youtubeFeedXML).subscribe((youtubeFeed: YoutubeFeed) => {
        if (youtubeFeed.feed && youtubeFeed.feed.entry && youtubeFeed.feed.entry[0]) {
          youtubeFeed = new YoutubeFeed(youtubeFeed);
          const entry = youtubeFeed.feed.entry[0];
          this.logger.log('viedeoId:' + entry['yt:videoId'] + ' channelId: ' + entry['yt:channelId']);
          this.contentService.dealWithAtomFeed(youtubeFeed);
        }
      });
    });
  }

}
