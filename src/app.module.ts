import { Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ContentModule } from './content/infrastructure/content.module';
import { ConfigurationModule } from './core/configuration/configuration.module';
import { typeormConfig } from './core/configuration/typeorm.config';
import { GithubModule } from './github/github.module';
import { HelperModule } from './helper/helper.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { MetaMediaModule } from './meta-media/meta-media.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...typeormConfig,
      autoLoadEntities: true,
      keepConnectionAlive: true,
    }),
    ListMetaMediaModule,
    MetaMediaModule,
    ContentModule,
    HelperModule,
    GithubModule,
    ConfigurationModule,
    MaintenanceModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
})
export class AppModule {}
