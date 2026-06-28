import { Module } from '@nestjs/common';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { IpRateLimitGuard } from './ip-rate-limit.guard';
import { ServerAnalyticsMiddleware } from './server-analytics.middleware';

@Module({
  controllers: [AnalyticsController],
  providers: [
    PrismaService,
    AnalyticsService,
    IpRateLimitGuard,
    ServerAnalyticsMiddleware,
  ],
  // Exportés pour que AppModule puisse appliquer le middleware de mesure
  // serveur-side (qui injecte AnalyticsService) sur toutes les routes.
  exports: [AnalyticsService, ServerAnalyticsMiddleware],
})
export class AnalyticsModule {}
