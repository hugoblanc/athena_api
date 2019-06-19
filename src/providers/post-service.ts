import { Injectable } from '@nestjs/common';
import { ExternalService } from './external-service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Post } from 'src/models/post';

@Injectable()
export class PostService {

  private static BASE_ROUTE = '/wp-json/wp/v2/posts?_embed';

  constructor(private externalService: ExternalService) { }

  /**
   * Cette methode récupère une listede post pour un nom d'hote données
   * @param hostname le nom d'hote de la ressource cible
   */
  getPost(hostname: string): Observable<Post[]> {
    return this.externalService.get(hostname + PostService.BASE_ROUTE)
      .pipe(map((posts) => {
        return posts.map((post) => new Post(post));
      }));
  }
}
