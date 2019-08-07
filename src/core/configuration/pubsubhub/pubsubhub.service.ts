import { Injectable } from '@nestjs/common';
import { IConfigurationService } from '../iconfiguration-service';
import { FormatService } from '../../../helper/format/format.service';
import { PubSub } from './pubsub';
import { IYoutubeFeed } from './Iyoutube-feed';

@Injectable()
export class PubsubhubService implements IConfigurationService {

  constructor(private formatService: FormatService) { }

  init() {
    const pubServer = new PubSub();
    const youtubeFeed$ = pubServer.init();
    youtubeFeed$.subscribe((youtubeFeedXML: string) => {
      const youtubeFeed: IYoutubeFeed = FormatService.decodeXML(youtubeFeedXML);
      const entry = youtubeFeed.feed.entry[0];
      console.log(entry['yt:channelId']);
      console.log(entry['yt:videoId']);
      console.log(entry.title);

    });
  }

}
