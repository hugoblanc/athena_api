import { HttpModule, Module, Logger } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { CronService } from '../providers/cron-service';
import { ExternalService } from '../providers/external-service';
import { MediaService } from '../providers/media/media.service';
import { NotificationService } from '../providers/notification-service';
import { PostService } from '../providers/post-service';
import { FormatService } from './format/format.service';

@Module({
  imports: [ScheduleModule.register(), HttpModule],
  providers: [CronService, ExternalService, PostService, NotificationService, MediaService, FormatService],
  exports: [ExternalService, FormatService, NotificationService],
})
export class HelperModule { }
