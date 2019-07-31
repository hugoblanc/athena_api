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
    ],
    controllers: [AppController, MediaController],
    providers: [AppService, CronService, ExternalService, PostService, NotificationService, MediaService],
})
export class AppModule { }
