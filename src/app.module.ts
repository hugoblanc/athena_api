import {
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleDestroy,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { RequestLoggerMiddleware } from './core/middleware/request-logger.middleware';
import { ContentModule } from './content/infrastructure/content.module';
import { ConfigurationModule } from './core/configuration/configuration.module';
import { typeormConfig } from './core/configuration/typeorm.config';
import { IdeaModule } from './idea/idea.module';
import { HelperModule } from './helper/helper.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { MetaMediaModule } from './meta-media/meta-media.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { QaModule } from './qa/qa.module';
import { LawProposalModule } from './law-proposal/infrastructure/law-proposal.module';
import { AuthModule } from './auth/infrastructure/auth.module';
import { PodcastModule } from './podcast/infrastructure/podcast.module';
import { PushModule } from './push/push.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SurveyModule } from './survey/survey.module';
import { AppConfigModule } from './config/app-config.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...typeormConfig,
      autoLoadEntities: true,
      keepConnectionAlive: true,
    }),
    AuthModule, // Module d'authentification (doit être importé tôt pour le guard global)
    ListMetaMediaModule,
    MetaMediaModule,
    ContentModule,
    HelperModule,
    IdeaModule,
    ConfigurationModule,
    MaintenanceModule,
    QaModule,
    LawProposalModule,
    PodcastModule,
    PushModule,
    AnalyticsModule,
    SurveyModule,
    AppConfigModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
