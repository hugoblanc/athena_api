import { Injectable, Logger } from '@nestjs/common';
import { empty, Observable } from 'rxjs';
import { concatMap, expand, map } from 'rxjs/operators';
import { YoutubeFeed } from '../../../core/configuration/pubsubhub/youtube-feed';
import { MetaMediaType } from '../../../meta-media/meta-media-type.enum';
import { MetaMedia } from '../../../meta-media/meta-media.entity';
import { ExternalService } from '../../../providers/external-service';
import { Content } from '../../domain/content.entity';
import { Image } from '../../domain/image.entity';
import { Item, PlaylistItemDto } from '../dto/playlist-item.dto';

@Injectable()
export class YoutubeService {
  private static BASE_URL =
    'https://www.googleapis.com/youtube/v3/playlistItems';
  private readonly logger = new Logger(YoutubeService.name);

  constructor(private http: ExternalService) { }

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

    return this.http.get(YoutubeService.BASE_URL, config).pipe(
      map(data => {
        return data;
      }),
    );
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

    return this.http.get(YoutubeService.BASE_URL, config).pipe(
      map((playlist: PlaylistItemDto) => {
        return playlist.items[0];
      }),
    );
  }

  /**
   * Cete methode se charge de récupérer toutes les pages l'une après l'autre
   * des résultat de la playlist "vidéo" c a d l'ensemble des vidéos d'une chaine youtube
   * @param metaMedia le metaMedia cible
   */
  getAllContentForTargetId(metaMedia: MetaMedia) {
    const content$ = this.getItems(
      this.createPlaylistIdFromChannelID(metaMedia.url),
    ).pipe(
      // Récursive observable
      expand((playlistItems: PlaylistItemDto) => {
        // Tant qu'il y a une next page
        if (playlistItems.nextPageToken) {
          return this.getItems(
            this.createPlaylistIdFromChannelID(metaMedia.url),
            playlistItems.nextPageToken,
          );
        } else {
          // Sinon terminus
          return empty();
        }
      }),
      concatMap((playlistItems: PlaylistItemDto) => {
        // On creait un tableau de content correspondant au tableau de vidéo recupéré
        const content = playlistItems.items.map((item: Item) =>
          this.createContentFromItem(metaMedia, item),
        );
        return content;
      }),
    );

    return content$;
  }

  dealWithNewFeed(
    content: Content,
    metaMedia: MetaMedia,
    youtubeFeed: YoutubeFeed,
  ): Observable<Content> {
    return this.getItem(
      this.createPlaylistIdFromChannelID(youtubeFeed.metaMediaId),
      youtubeFeed.id,
    ).pipe(
      map(item => {
        this.logger.log('New item récupéré depuis youtube');
        return this.createContentFromItem(metaMedia, item, content);
      }),
    );
  }

  createContentFromItem(
    metaMedia: MetaMedia,
    item: Item,
    existingContent?: Content,
  ): Content {
    if (item == null) {
      throw new Error("L'item de la playlist youtube est incorrect ");
    }

    const image: Image = {
      id:
        existingContent && existingContent.image
          ? existingContent.image.id
          : null,
      url: item.snippet.thumbnails.medium.url,
      width: item.snippet.thumbnails.medium.width,
      height: item.snippet.thumbnails.medium.height,
    };

    const content: Content = {
      id: existingContent ? existingContent.id : null,
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

  /**
   * Pour transformer un id chaine en id playlist il suffit de remplacer le deuxième char par un U
   * @param channelId La chaine de charactère de l'id de la chaine
   */
  private createPlaylistIdFromChannelID(channelId: string) {
    const index = 1;
    const playlistID =
      channelId.substr(0, index) + 'U' + channelId.substr(index + 1);
    return playlistID;
  }
}
