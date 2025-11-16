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
import { TextFormatter } from '../content/application/providers/text-formatter.service';
import { TextCheeriosFormatter } from '../content/infrastructure/text-cheerios-formatter.service';

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
    { provide: TextFormatter, useClass: TextCheeriosFormatter },
  ],
  exports: [ExternalService, PostService, FormatService, NotificationService],
})
export class HelperModule {}
