import { Module, HttpModule } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CronService } from './providers/cron-service';
import { ExternalService } from './providers/external-service';
import { PostService } from './providers/post-service';
import { NotificationService } from './providers/notification-service';
import { MediaController } from './controllers/media/media.controller';
import { MediaService } from './providers/media/media.service';

@Module({
  imports: [ScheduleModule.register(), HttpModule],
  controllers: [AppController, MediaController],
  providers: [AppService, CronService, ExternalService, PostService, NotificationService, MediaService],
})
export class AppModule {}
