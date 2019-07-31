import { Module } from '@nestjs/common';
import { ListMetaMedia } from './list-meta-media.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListMetaMediaService } from './list-meta-media.service';
import { ListMetaMediaController } from './list-meta-media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ListMetaMedia])],
  providers: [ListMetaMediaService],
  controllers: [ListMetaMediaController],
})
export class ListMetaMediaModule {}
