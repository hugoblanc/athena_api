import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Public } from '../auth/infrastructure/decorators';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAdminGuard } from './analytics-admin.guard';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { IpRateLimitGuard } from './ip-rate-limit.guard';

@Controller('analytics')
@Public()
@UseGuards(IpRateLimitGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * POST /analytics/event
   * Compteur agrégé de la growth loop. Public, throttlé par IP, sans donnée personnelle.
   */
  @Post('event')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async event(@Body() dto: CreateAnalyticsEventDto): Promise<void> {
    await this.analyticsService.record(dto);
  }

  /**
   * GET /analytics/funnel?days=14&refType=content  (clé admin requise)
   * Lecture agrégée de la growth loop : totaux, k-factor, funnel par jour,
   * top contenus repartagés. Aucune donnée personnelle.
   */
  @Get('funnel')
  @UseGuards(AnalyticsAdminGuard)
  funnel(
    @Query('days') days?: string,
    @Query('refType') refType?: string,
  ): Promise<unknown> {
    const parsed = days ? Number.parseInt(days, 10) : undefined;
    return this.analyticsService.funnel({
      days: Number.isNaN(parsed as number) ? undefined : parsed,
      refType,
    });
  }

  /**
   * GET /analytics/usage?days=30  (clé admin requise)
   * Lecture agrégée de l'usage produit : écrans vus, features utilisées, top
   * contenus joués, sessions (navigateur vs PWA installée), série par jour.
   * Aucune donnée personnelle.
   */
  @Get('usage')
  @UseGuards(AnalyticsAdminGuard)
  usage(@Query('days') days?: string): Promise<unknown> {
    const parsed = days ? Number.parseInt(days, 10) : undefined;
    return this.analyticsService.usage({
      days: Number.isNaN(parsed as number) ? undefined : parsed,
    });
  }
}
