import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../../storage/infrastructure/storage.module';
import { PodcastController } from '../application/podcast.controller';
import { PodcastService } from '../application/events/podcast.service';
import { GeneratePodcastForContentHandler } from '../application/commands/generate-podcast-for-content.handler';
import { GenerateMissingPodcastsHandler } from '../application/commands/generate-missing-podcasts.handler';
import { GetPodcastListHandler } from '../application/queries/get-podcast-list/get-podcast-list.handler';
import { GetPodcastByContentIdHandler } from '../application/queries/get-podcast-by-content-id/get-podcast-by-content-id.handler';
import { GetPodcastByIdHandler } from '../application/queries/get-podcast-by-id/get-podcast-by-id.handler';
import { PodcastGeneratorService } from '../application/providers/podcast-generator.service';
import { GeminiPodcastGeneratorService } from './gemini-podcast-generator.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    StorageModule,
  ],
  controllers: [PodcastController],
  providers: [
    PrismaService,
    PodcastService,
    GeneratePodcastForContentHandler,
    GenerateMissingPodcastsHandler,
    GetPodcastListHandler,
    GetPodcastByContentIdHandler,
    GetPodcastByIdHandler,
    { provide: PodcastGeneratorService, useClass: GeminiPodcastGeneratorService },
  ],
  exports: [PodcastService],
})
export class PodcastModule {}
