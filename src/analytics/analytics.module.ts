import { Module } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { IpRateLimitGuard } from './ip-rate-limit.guard';

@Module({
  controllers: [AnalyticsController],
  providers: [PrismaService, AnalyticsService, IpRateLimitGuard],
})
export class AnalyticsModule {}
