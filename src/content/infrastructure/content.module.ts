import { Module } from '@nestjs/common';
import { ContentService } from '../application/content.service';
import { YoutubeService } from '../application/youtube/youtube.service';
import { ContentController } from '../application/content.controller';
import { Content } from '../domain/content.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMediaModule } from '../../meta-media/meta-media.module';
import { HelperModule } from '../../helper/helper.module';
import { Image } from '../domain/image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, Content]),
    MetaMediaModule,
    HelperModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, YoutubeService],
  exports: [ContentService],
})
export class ContentModule {}
