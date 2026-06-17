import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/infrastructure/decorators';
import { AppConfig, AppConfigService } from './app-config.service';

/**
 * Configuration distante consommée par l'app native Ionic au démarrage.
 * Public (aucune donnée sensible) et tolérant : le client échoue en silence
 * si l'endpoint ne répond pas (bannière OFF par défaut côté app).
 */
@Controller('app-config')
@Public()
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  getConfig(@Query('versionCode') versionCode?: string): AppConfig {
    const parsed = versionCode ? Number.parseInt(versionCode, 10) : undefined;
    return this.appConfigService.getConfig(
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}
