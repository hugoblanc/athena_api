import { BeforeApplicationShutdown, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContentService } from '../../../content/content.service';
import { FormatService } from '../../../helper/format/format.service';
import { PubSub } from './pubsub';
import { YoutubeFeed } from './youtube-feed';

@Injectable()
export class PubsubhubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubsubhubService.name);

  pubSubServer: PubSub;

  constructor(private contentService: ContentService) { }

  onModuleDestroy() {
    this.logger.log('stop pub pub server');
    this.pubSubServer.unsubscribeAll();
  }

  onModuleInit() {
    this.logger.log('start pub sub server');
    this.pubSubServer = new PubSub();
    const youtubeFeed$ = this.pubSubServer.init();
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
