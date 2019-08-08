import { Injectable, Logger } from '@nestjs/common';
import { ExternalService } from '../../providers/external-service';
import { PlaylistItemDto, Item } from '../dto/playlist-item.dto';
import { Observable, empty } from 'rxjs';
import { Content } from '../content.entity';
import { expand, concatMap, map } from 'rxjs/operators';
import { MetaMedia } from '../../meta-media/meta-media.entity';
import { Image } from '../image.entity';
import { MetaMediaType } from '../../meta-media/meta-media-type.enum';
import { Entry, YoutubeFeed } from '../../core/configuration/pubsubhub/youtube-feed';
import { ContentService } from '../content.service';

@Injectable()
export class YoutubeService {
  private static BASE_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
  private readonly logger = new Logger(YoutubeService.name);

  constructor(private http: ExternalService) {

  }

  getItems(targetId: string, pageId: string = ''): Observable<PlaylistItemDto> {
    const config: any = {
      params: {
        part: 'snippet',
        playlistId: targetId,
        key: process.env.ATHENA_YOUTUBE_KEY,
      },
    };

    if (pageId !== '') {
      config.params.pageToken = pageId;
    }

    return this.http.get(YoutubeService.BASE_URL, config)
      .pipe(map((data) => {
        return data;
      }));
  }

  getItem(playlistId: string, videoId: string) {
    const config: any = {
      params: {
        part: 'snippet',
        key: process.env.ATHENA_YOUTUBE_KEY,
        playlistId,
        videoId,
      },
    };

    return this.http.get(YoutubeService.BASE_URL, config)
      .pipe(map((playlist: PlaylistItemDto) => {
        return playlist.items[0];
      }));
  }

  getAllContentForTargetId(metaMedia: MetaMedia) {

    const content$ = this.getItems(this.createPlaylistIdFromChannelID(metaMedia.url)).pipe(
      expand((playlistItems: PlaylistItemDto) => {
        if (playlistItems.nextPageToken) {
          return this.getItems(this.createPlaylistIdFromChannelID(metaMedia.url), playlistItems.nextPageToken);
        } else {
          return empty();
        }
      }),
      concatMap((playlistItems: PlaylistItemDto) => {
        const content = playlistItems.items.map((item: Item) => this.createContentFromItem(metaMedia, item));
        return content;
      }),
    );

    return content$;
  }

  dealWithNewFeed(content: Content, metaMedia: MetaMedia, youtubeFeed: YoutubeFeed) {
    return this.getItem(this.createPlaylistIdFromChannelID(youtubeFeed.metaMediaId), youtubeFeed.id)
      .pipe(map(item => {
        this.logger.log('New item récupéré depuis youtube');
        return this.createContentFromItem(metaMedia, item, content);
      }),
      );
  }

  createContentFromItem(metaMedia: MetaMedia, item: Item, existingContent?: Content): Content {
    if (item == null) {
      throw new Error('L\'item de la playlist youtube est incorrect ');
    }

    const image: Image = {
      id: (existingContent && existingContent.image) ? existingContent.image.id : null,
      url: item.snippet.thumbnails.medium.url,
      width: item.snippet.thumbnails.medium.width,
      height: item.snippet.thumbnails.medium.height,
    };

    const content: Content = {
      id: (existingContent ? existingContent.id : null),
      contentId: item.snippet.resourceId.videoId,
      contentType: MetaMediaType.YOUTUBE,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: new Date(item.snippet.publishedAt),
      image,
      metaMedia,
    };
    return content;
  }

  private createPlaylistIdFromChannelID(channelId: string) {
    const index = 1;
    const playlistID = channelId.substr(0, index) + 'U' + channelId.substr(index + 1);
    return playlistID;
  }
}
