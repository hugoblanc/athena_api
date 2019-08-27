import { Injectable } from '@nestjs/common';
import { Cron, NestDistributedSchedule } from 'nest-schedule';
import { ContentService } from '../content/content.service';

@Injectable()
export class CronService extends NestDistributedSchedule {
  constructor(private contentService: ContentService) {
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

  @Cron('1 * * * * *')
  async cronJob() {
    console.log('TOTOTO');

    this.contentService.pollingContent();
    console.log('TATAA');
  }

}
