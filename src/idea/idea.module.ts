import { Module } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { IdeaController } from './idea.controller';
import { IdeaService } from './idea.service';

@Module({
  controllers: [IdeaController],
  providers: [PrismaService, IdeaService],
  exports: [IdeaService],
})
export class IdeaModule {}
