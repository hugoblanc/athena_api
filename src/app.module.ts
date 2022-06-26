import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ContentModule } from './content/content.module';
import { ConfigurationModule } from './core/configuration/configuration.module';
import { typeormCOnfig } from './core/configuration/typeorm.config';
import { GithubModule } from './github/github.module';
import { HelperModule } from './helper/helper.module';
import { ListMetaMediaModule } from './list-meta-media/list-meta-media.module';
import { MetaMediaModule } from './meta-media/meta-media.module';




@Module({
  imports: [
    TypeOrmModule.forRoot(typeormCOnfig),
    ListMetaMediaModule,
    MetaMediaModule,
    ContentModule,
    HelperModule,
    GithubModule,
    ConfigurationModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
