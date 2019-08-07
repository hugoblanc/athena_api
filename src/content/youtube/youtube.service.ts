import { Injectable } from '@nestjs/common';
import { ExternalService } from '../../providers/external-service';
import { PlaylistItemDto, Item } from '../dto/playlist-item.dto';
import { Observable, empty } from 'rxjs';
import { Content } from '../content.entity';
import { expand, concatMap, map } from 'rxjs/operators';
import { MetaMedia } from '../../meta-media/meta-media.entity';
import { Image } from '../image.entity';

@Injectable()
export class YoutubeService {
  private static BASE_URL = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=';
  private static KEY = '&key=';

  constructor(private http: ExternalService) {

  }

  getItems(targetId: string, pageId: string = ''): Observable<PlaylistItemDto> {
    if (pageId !== '') {
      pageId = '&pageToken=' + pageId;
    }
    return this.http.get(YoutubeService.BASE_URL + targetId + pageId + YoutubeService.KEY + process.env.ATHENA_YOUTUBE_KEY)
      .pipe(map((data) => {
        return data;
      }));
  }

  getAllContentForTargetId(metaMedia: MetaMedia) {

    const content$ = this.getItems(metaMedia.url).pipe(
      expand((playlistItems: PlaylistItemDto) => {
        if (playlistItems.nextPageToken) {
          return this.getItems(metaMedia.url, playlistItems.nextPageToken);
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

  createContentFromItem(metaMedia: MetaMedia, item: Item): Content {
    if (item == null) {
      throw new Error('L\'item de la playlist youtube est incorrect ');
    }

    const image: Image = {
      id: null,
      url: item.snippet.thumbnails.medium.url,
      width: item.snippet.thumbnails.medium.width,
      height: item.snippet.thumbnails.medium.height,
    };

    const content: Content = {
      id: null,
      contentId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      date: new Date(item.snippet.publishedAt),
      image,
      metaMedia,
    };
    return content;
  }
}
