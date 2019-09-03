import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Content } from '../content/content.entity';
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

  private static BASE_ROUTE = '/wp-json/wp/v2/posts?_embed';

  private oldPosts: any = {};

  constructor(private externalService: ExternalService) {
  }

  /**
   * Cette methode récupère une listede post pour un nom d'hote données
   * @param arg1 le nom d'hote de la ressource cible
   */
  getPost(arg1: string, key: string): Observable<Post[]> {
    return this.externalService.get(arg1 + PostService.BASE_ROUTE)
      .pipe(
        map((posts) => posts.map((post) => new Post(post))));
  }

  getContent(metaMedia: MetaMedia): Observable<Content[]> {
    return this.getPost(metaMedia.url, metaMedia.key)
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

    const content: Content = {
      id: (existingContent ? existingContent.id : null),
      contentId: post.id.toString(),
      contentType: MetaMediaType.WORDPRESS,
      title: post.title.rendered,
      description: post.content.rendered,
      publishedAt: new Date(post.date),
      image: post.image,
      metaMedia: post.metaMedia,
    };
    return content;
  }

}
