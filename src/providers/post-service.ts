  import { Injectable } from '@nestjs/common';
  import { ExternalService } from './external-service';
  import { Observable } from 'rxjs';
  import { map, tap } from 'rxjs/operators';
  import { Post } from 'src/models/post';
  import { IcreateNotifService } from 'src/core/icreate-notif-service.interface';
import { NotificationService } from './notification-service';

  @Injectable()
  export class PostService implements IcreateNotifService<Post>{

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
          tap((posts) => this.areTheyNewValues(posts)));
    }

    private areTheyNewValues(posts: Post[]) {
      const newPost = posts.filter((post)=> this.isPostInPosts);
      // Gestion de la création && envoi de notif 
      if(newPost != null && newPost.length > 0){
        const message = this.createNotif(newPost[0]);
        this.notificationService.sendMessage(message);
      }

      // On met a jour les infoirmations local 
      this.posts = posts;
    }

    createNotif(object: Post){

      const message = {
        notification: {
          title: 'Nouvel article',
          body: object.title
        },
        topic: 'condition'
      };


      return message;
    }


    private isPostInPosts(post: Post): boolean {
      for(const oldPost of this.posts){
        if(post.isIdEqual(oldPost.id)) return true;
      }
      return false;
    }

  }
