import { Injectable } from '@nestjs/common';
import { ExternalService } from './external-service';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { IcreateNotifService } from 'src/core/icreate-notif-service.interface';
import { NotificationService } from './notification-service';
import { Post } from '../models/post';
@Injectable()
export class PostService implements IcreateNotifService<Post> {

  private static BASE_ROUTE = '/wp-json/wp/v2/posts?_embed';

  private posts: Post[];

  constructor(private externalService: ExternalService, private notificationService: NotificationService) { }

  /**
   * Cette methode récupère une listede post pour un nom d'hote données
   * @param hostname le nom d'hote de la ressource cible
   */
  getPost(hostname: string): Observable<Post[]> {
    return this.externalService.get(hostname + PostService.BASE_ROUTE)
      .pipe(
        map((posts) => posts.map((post) => new Post(post))),
        tap((posts) => this.findNewValueAndSendNotif(posts)));
  }

  /**
   * Cette methode permet de comparer la liste des anciens posts avec ceux qu'on vient de get
   * elle récupère la liste des nouveau posts en déclanche l'envoi de notif associé
   * @param posts une liste de posts
   */
  private findNewValueAndSendNotif(posts: Post[]): void {
    const newPost = posts.filter((post) => this.isPostInPosts);
    // Gestion de la création && envoi de notif
    if (newPost != null && newPost.length > 0) {
      const message = this.createNotif(newPost[0]);
      this.notificationService.sendMessage(message);
    }

    // On met a jour les infoirmations local
    this.posts = posts;
  }

  /**
   * Cette methode permet de creer un notification basé sur un post
   * @param object le post a convertir en notification
   */
  createNotif(object: Post): any {

    const message = {
      notification: {
        title: 'Nouvel article par Le Vent Se Lève',
        body: object.getTitle(),
      },
      topic: 'all',
    };

    return message;
  }

  /**
   * Cette methode cherche dans la liste des anciens posts si celui passé en param
   * est déjà présent ou pas
   * Elle renvoi false si elle ne le trouve pas et true si oui
   * @param post le nouveau post a trouver dans la liste des anciens
   */
  private isPostInPosts(post: Post): boolean {
    for (const oldPost of this.posts) {
      if (post.isIdEqual(oldPost.id)) { return true; }
    }
    return false;
  }

}
