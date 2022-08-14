import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentModule } from '../content/infrastructure/content.module';
import { CronService } from '../providers/cron-service';
import { ExternalService } from '../providers/external-service';
import { MediaService } from '../providers/media/media.service';
import { NotificationService } from '../providers/notification-service';
import { PostService } from '../providers/post-service';
import { FormatService } from './format/format.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    forwardRef(() => ContentModule),
  ],
  providers: [
    CronService,
    ExternalService,
    PostService,
    NotificationService,
    MediaService,
    FormatService,
  ],
  exports: [ExternalService, PostService, FormatService, NotificationService],
})
export class HelperModule {}
