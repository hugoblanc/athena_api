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
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMediaModule } from './meta-media/meta-media.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { ContentService } from './content/content.service';
import { ContentController } from './content/content.controller';

@Module({
    imports: [
        ScheduleModule.register(),
        HttpModule,
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.ATHENA_DB_HOST,
            port: parseInt(process.env.ATHENA_DB_PORT, 10),
            username: process.env.ATHENA_DB_USER,
            password: process.env.ATHENA_DB_PASSWORD,
            database: 'athena',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
        }),
        MetaMediaModule,
        ListMetaMediaModule,
    ],
    controllers: [AppController, MediaController, ContentController],
    providers: [AppService, CronService, ExternalService, PostService, NotificationService, MediaService, ContentService],
})
export class AppModule { }
