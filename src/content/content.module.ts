import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { YoutubeService } from './youtube/youtube.service';
import { ContentController } from './content.controller';
import { Content } from './content.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMediaModule } from '../meta-media/meta-media.module';
import { HelperModule } from '../helper/helper.module';
import { Image } from './image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Image, Content]), MetaMediaModule, HelperModule],
  controllers: [ContentController],
  providers: [ContentService, YoutubeService],
})
export class ContentModule {}

