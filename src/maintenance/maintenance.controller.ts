import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { MaintenanceService, MigrationResult } from './maintenance.service';

@Controller('maintenance')
export class MaintenanceController {
  private readonly logger = new Logger(MaintenanceController.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('populate-plaintext')
  async populatePlainText(
    @Headers('x-maintenance-key') maintenanceKey: string,
  ): Promise<MigrationResult> {
    // Vérifier la clé de maintenance depuis les variables d'environnement
    const validKey = process.env.MAINTENANCE_KEY;

    if (!validKey || maintenanceKey !== validKey) {
      this.logger.warn('Unauthorized maintenance attempt');
      throw new UnauthorizedException('Invalid maintenance key');
    }

    this.logger.log('Starting plainText population via API endpoint...');

    const result = await this.maintenanceService.populatePlainText();

    this.logger.log(
      `Migration completed: ${result.updated} updated, ${result.failed} failed`,
    );

    return result;
  }
}
