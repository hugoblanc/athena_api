import { Injectable } from '@nestjs/common';
import { ExternalService } from './external-service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { IcreateNotifService } from 'src/core/icreate-notif-service.interface';
import { NotificationService } from './notification-service';
import { Post } from '../models/post';
import { MediaService } from './media/media.service';
import { XmlEntities } from 'html-entities';
import { FormatService } from '../helper/format/format.service';

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
export class PostService implements IcreateNotifService<Post> {

  private static BASE_ROUTE = '/wp-json/wp/v2/posts?_embed';

  private oldPosts: any = {};

  constructor(private externalService: ExternalService,
              private notificationService: NotificationService,
              private formatService: FormatService) {
  }

  /**
   * Cette methode récupère une listede post pour un nom d'hote données
   * @param hostname le nom d'hote de la ressource cible
   */
  getPost(hostname: string, key: string): Observable<Post[]> {
    return this.externalService.get(hostname + PostService.BASE_ROUTE)
      .pipe(
        map((posts) => posts.map((post) => new Post(post))),
        tap((posts) => this.findNewValueAndSendNotif(posts, key)));
  }

  /**
   * Cette methode permet de comparer la liste des anciens posts avec ceux qu'on vient de get
   * elle récupère la liste des nouveau posts en déclanche l'envoi de notif associé
   * @param posts une liste de posts
   */
  private findNewValueAndSendNotif(posts: Post[], key: string): void {
    const newPost = posts.filter((post) => !this.isPostInPosts(post, key));
    // Gestion de la création && envoi de notif
    if (newPost != null && newPost.length > 0) {
      const messages = this.createNotif(newPost[0], key);
      this.notificationService.sendMessage(messages);
    }

    // On met a jour les infoirmations local
    this.oldPosts[key] = posts;
  }

  /**
   * Cette methode permet de creer un notification basé sur un post
   * @param object le post a convertir en notification
   */
  createNotif(object: Post, key: string): any {
    // On récupère le bon metaMedia en fonction de la clé présent
    const metaMedia = MediaService.MEDIAS.find((meta) => (meta.key === key));
    // On converties les titre l'article en format text classique plutot que HTML
    const entities = new XmlEntities();
    object.title.rendered = entities.decode(object.getTitle());
    // Pour une raison qui m'échappe l'apostrophe ne fonctionne toujours pas
    object.title.rendered = object.title.rendered.replace('&rsquo;', '\'');

    const conditions = this.notificationService.createConditionFromKeyAndCategories(metaMedia.key, object.categories);

    const messages = this.notificationService.createMessage(
      'Nouvel article par ' + metaMedia.title,
      object.getTitle(),
      key,
      object.id.toString(),
      conditions,
    );

    return messages;
  }

  /**
   * Cette methode cherche dans la liste des anciens posts si celui passé en param
   * est déjà présent ou pas
   * Elle renvoi false si elle ne le trouve pas et true si oui
   * @param post le nouveau post a trouver dans la liste des anciens
   */
  private isPostInPosts(post: Post, key: string): boolean {
    if (!this.oldPosts[key]) {
      return false;
    }

    for (const oldPost of this.oldPosts[key]) {
      if (post.isIdEqual(oldPost.id)) { return true; }
    }

    return false;
  }

}
