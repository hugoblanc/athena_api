import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelperModule } from '../../helper/helper.module';
import { MetaMediaModule } from '../../meta-media/meta-media.module';
import { SpeechModule } from '../../speech/infrastructure/speech.module';
import { StorageModule } from '../../storage/infrastructure/storage.module';
import { ExtractSpeechForContentHandler } from '../application/commands/extract-speech-for-content.handler';
import { ContentController } from '../application/content.controller';
import { ContentService } from '../application/content.service';
import { AudioService } from '../application/events/audio.service';
import { SpeechGeneratorService } from '../application/providers/speech-generator.service';
import { TextFormatter } from '../application/providers/text-formatter.service';
import { GetAudioContentUrlByIdHandler } from '../application/queries/get-audio-content-url-by-id/get-audio-content-url-by-id.handler';
import { GetIdFromContentIdAndKeyHandler } from '../application/queries/get-id-from-content-id-and-media-key/get-id-from-content-id-and-media-key.handler';
import { GetLastContentPaginatedHandler } from '../application/queries/get-last-content-paginated/get-last-content-paginated.handler';
import { GetShareableContentHandler } from '../application/queries/get-shareable-content/get-shareable-content.handler';
import { YoutubeService } from '../application/youtube/youtube.service';
import { Audio } from '../domain/audio.entity';
import { Content } from '../domain/content.entity';
import { Image } from '../domain/image.entity';
import { ContentFactoryBuilder } from './content-factory.builder';
import { SpeechWavGeneratorService } from './speech-wav-generator.service';
import { TextCheeriosFormatter } from './text-cheerios-formatter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, Audio, Content]),
    MetaMediaModule,
    HelperModule,
    CqrsModule,
    SpeechModule,
    StorageModule,
  ],
  controllers: [ContentController],
  providers: [
    ContentService,
    YoutubeService,
    ContentFactoryBuilder,
    GetLastContentPaginatedHandler,
    GetShareableContentHandler,
    GetAudioContentUrlByIdHandler,
    GetIdFromContentIdAndKeyHandler,
    ExtractSpeechForContentHandler,
    AudioService,
    { provide: TextFormatter, useClass: TextCheeriosFormatter },
    { provide: SpeechGeneratorService, useClass: SpeechWavGeneratorService },
  ],
  exports: [ContentService],
})
export class ContentModule {}
