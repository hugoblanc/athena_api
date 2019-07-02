import { Injectable } from '@nestjs/common';
import { Cron, NestDistributedSchedule } from 'nest-schedule';
import { PostService } from './post-service';

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

  @Cron('10 * * * * *')
  async cronJob() {

    this.postService.getPost('https://lvsl.fr')
      .subscribe((posts) => {
        // On ne fait rien
      });
  }
}
