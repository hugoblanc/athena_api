import { Module } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { IpRateLimitGuard } from '../analytics/ip-rate-limit.guard';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';

@Module({
  controllers: [SurveyController],
  providers: [PrismaService, SurveyService, IpRateLimitGuard],
})
export class SurveyModule {}
