import { Injectable, Logger } from '@nestjs/common';
import { IConfigurationService } from '../iconfiguration-service';
import { FormatService } from '../../../helper/format/format.service';
import { PubSub } from './pubsub';
import { IYoutubeFeed } from './Iyoutube-feed';

@Injectable()
export class PubsubhubService implements IConfigurationService {

  private readonly logger = new Logger(PubsubhubService.name);

  init() {
    const pubServer = new PubSub();
    const youtubeFeed$ = pubServer.init();
    this.logger.log('subscribe');
    youtubeFeed$.subscribe((youtubeFeedXML: string) => {
      FormatService.decodeXML(youtubeFeedXML).subscribe((youtubeFeed: IYoutubeFeed) => {
        const entry = youtubeFeed.feed.entry[0];
        this.logger.log('viedeoId:' + entry['yt:videoId'] + ' channelId: ' + entry['yt:channelId']);
      });
    });
  }

}
