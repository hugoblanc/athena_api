import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMedia } from './meta-media.entity';
import { MetaMediaService } from './meta-media.service';
import { MetaMediaController } from './meta-media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MetaMedia])],
  providers: [MetaMediaService],
  controllers: [MetaMediaController],
  exports: [MetaMediaService],
})
export class MetaMediaModule { }
