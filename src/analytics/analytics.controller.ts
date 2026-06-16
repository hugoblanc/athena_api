import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Public } from '../auth/infrastructure/decorators';
import { AnalyticsService } from './analytics.service';
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
}
