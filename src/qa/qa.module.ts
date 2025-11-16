import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { QaJob } from './domain/qa-job.entity';
import { ContentEmbedding } from '../content/domain/content-embedding.entity';
import { QaController } from './qa.controller';
import { QaService } from './application/qa.service';
import { VectorSearchService } from './application/vector-search.service';
import { RagService } from './application/rag.service';
import { EmbeddingsService } from '../content/application/providers/embeddings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QaJob, ContentEmbedding]),
    HttpModule,
  ],
  controllers: [QaController],
  providers: [
    QaService,
    VectorSearchService,
    RagService,
    EmbeddingsService,
  ],
})
export class QaModule {}
