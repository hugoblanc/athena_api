import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Content } from '../content/domain/content.entity';
import { ContentEmbedding } from '../content/domain/content-embedding.entity';
import { TextFormatter } from '../content/application/providers/text-formatter.service';
import { TextCheeriosFormatter } from '../content/infrastructure/text-cheerios-formatter.service';
import { ChunkingService } from '../content/application/providers/chunking.service';
import { EmbeddingsService } from '../content/application/providers/embeddings.service';
import { ContentEmbeddingService } from '../content/application/content-embedding.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../infrastructure/prisma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, ContentEmbedding]),
    HttpModule,
    CqrsModule,
  ],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    ContentEmbeddingService,
    ChunkingService,
    EmbeddingsService,
    { provide: TextFormatter, useClass: TextCheeriosFormatter },
    PrismaService,
  ],
})
export class MaintenanceModule {}
