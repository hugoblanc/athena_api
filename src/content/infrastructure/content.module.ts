import { Module } from '@nestjs/common';
import { ContentService } from '../application/content.service';
import { YoutubeService } from '../application/youtube/youtube.service';
import { ContentController } from '../application/content.controller';
import { Content } from '../domain/content.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMediaModule } from '../../meta-media/meta-media.module';
import { HelperModule } from '../../helper/helper.module';
import { Image } from '../domain/image.entity';
import { GetLastContentPaginatedHandler } from '../application/queries/get-last-content-paginated/get-last-content-paginated.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { GetShareableContentHandler } from '../application/queries/get-shareable-content/get-shareable-content.handler';
import { ContentFactoryBuilder } from './content-factory.builder';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, Content]),
    MetaMediaModule,
    HelperModule,
    CqrsModule
  ],
  controllers: [ContentController],
  providers: [ContentService, YoutubeService, ContentFactoryBuilder, GetLastContentPaginatedHandler, GetShareableContentHandler],
  exports: [ContentService],
})
export class ContentModule { }
