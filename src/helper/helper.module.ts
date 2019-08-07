import { HttpModule, Module, Logger } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { CronService } from '../providers/cron-service';
import { ExternalService } from '../providers/external-service';
import { MediaService } from '../providers/media/media.service';
import { NotificationService } from '../providers/notification-service';
import { PostService } from '../providers/post-service';

@Module({
  imports: [ScheduleModule.register(), HttpModule],
  providers: [CronService, ExternalService, PostService, NotificationService, MediaService],
  exports: [ExternalService],
})
export class HelperModule { }
