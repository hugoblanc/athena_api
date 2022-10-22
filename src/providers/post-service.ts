import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Content } from '../content/domain/content.entity';
import { MetaMediaType } from '../meta-media/meta-media-type.enum';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { Post } from '../models/post';
import { ExternalService } from './external-service';

/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Ce service est en charge de la gestion des articles
 * Il a aussi en résponssabilité la recherche des nouveau articles
 * Et la création de notification en fonction du résultat précédenet
 * Finalement il délègue l'envoi de la notificaiton au service de notification
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
@Injectable()
export class PostService {

  private static BASE_POST = '/wp-json/wp/v2/posts';
  private static EMBED = '?_embed';

  private oldPosts: any = {};

  constructor(private externalService: ExternalService) {
  }

  /**
   * Cette methode récupère une listede post pour un nom d'hote données
   * @param metaMediaUrl le nom d'hote de la ressource cible
   */
  getPosts(metaMediaUrl: string): Observable<Post[]> {
    return this.externalService.get(metaMediaUrl + PostService.BASE_POST + PostService.EMBED)
      .pipe(
        map((posts) => posts.map((post) => new Post(post))));
  }


  getPostByContent(content: Content): Observable<Post> {
    return this.externalService.get(content.metaMedia.url + PostService.BASE_POST + '/' + content.contentId + PostService.EMBED)
      .pipe(map((data: Post) => {
        return new Post(data);
      }));
  }

  getContent(metaMedia: MetaMedia): Observable<Content[]> {
    return this.getPosts(metaMedia.url)
      .pipe(map((posts: Post[]) => {
        return posts.map((post) => {
          post.metaMedia = metaMedia;
          return this.convertPostToContent(post);
        });
      }));
  }

  convertPostToContent(post: Post, existingContent?: Content): Content {
    if (post == null) {
      throw new Error('Le post est null, on ne peut pas le convertir en content ');
    }

    const content: Content = new Content({
      id: (existingContent ? existingContent.id : null),
      contentId: post.id.toString(),
      contentType: MetaMediaType.WORDPRESS,
      title: post.title.rendered,
      description: post.content.rendered,
      publishedAt: new Date(post.date),
      image: post.image,
      metaMedia: post.metaMedia,
    });
    return content;
  }

}
