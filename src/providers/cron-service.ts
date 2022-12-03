import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ContentService } from '../content/application/content.service';

@Injectable()
export class CronService {
  constructor(private contentService: ContentService) { }

  @Cron('1 */2 * * * *')
  async cronJob() {
    this.contentService.pollingContent();
  }
}
