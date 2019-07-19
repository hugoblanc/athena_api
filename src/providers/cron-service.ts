import { Injectable } from '@nestjs/common';
import { Cron, NestDistributedSchedule } from 'nest-schedule';
import { PostService } from './post-service';
import { Observable, concat } from 'rxjs';
import { MediaService } from './media/media.service';
import { delay } from 'rxjs/operators';

@Injectable()
export class CronService extends NestDistributedSchedule {
  constructor(private postService: PostService) {
    super();
  }

  async tryLock(method: string) {
    if (false) {
      return false;
    }

    return () => {
      // Release here.
    };
  }

  @Cron('1 */20 * * * *')
  async cronJob() {
    this.prepareRequestMediaWebsite();
  }

  // Observable<Post[][]>
  prepareRequestMediaWebsite(): void {
    // On va créer un d'ordre de requète asynchrone
    const articlesFromWebsites$ = MediaService.MEDIAS.map(
      // Ces requete seront sous la forme d'observable
      (metaMedia) => this.postService.getPost(metaMedia.url, metaMedia.key)
        // Et on ajoute un delay de 5000 ms après chaqu'une de ces requete
        .pipe(delay(10000)));

    const total1$ = concat(...articlesFromWebsites$);
    total1$.subscribe((data) => {
      for (const d of data) {
        console.log('---------Title' + d.title.rendered);
      }
    });
  }

}
