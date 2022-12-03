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
import { ExtractSpeechForContentHandler } from '../application/commands/extract-speech-for-content.handler';
import { TextFormatter } from '../application/providers/text-formatter.service';
import { TextCheeriosFormatter } from './text-cheerios-formatter.service';
import { SpeechModule } from '../../speech/infrastructure/speech.module';
import { StorageModule } from '../../storage/infrastructure/storage.module';
import { Audio } from '../domain/audio.entity';
import { SpeechWavGeneratorService } from './speech-wav-generator.service';
import { SpeechGeneratorService } from '../application/providers/speech-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, Audio, Content]),
    MetaMediaModule,
    HelperModule,
    CqrsModule,
    SpeechModule,
    StorageModule
  ],
  controllers: [ContentController],
  providers: [ContentService,
    YoutubeService,
    ContentFactoryBuilder,
    GetLastContentPaginatedHandler,
    GetShareableContentHandler,
    ExtractSpeechForContentHandler,
    { provide: TextFormatter, useClass: TextCheeriosFormatter },
    { provide: SpeechGeneratorService, useClass: SpeechWavGeneratorService }
  ],
  exports: [ContentService],
})
export class ContentModule { }
