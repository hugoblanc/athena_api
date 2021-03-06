import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaMedia } from './meta-media.entity';
import { MetaMediaService } from './meta-media.service';
@Module({
  imports: [TypeOrmModule.forFeature([MetaMedia])],
  providers: [MetaMediaService],
  controllers: [],
  exports: [MetaMediaService],
})
export class MetaMediaModule { }
