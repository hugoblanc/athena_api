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

  private validateMaintenanceKey(maintenanceKey: string): void {
    const validKey = process.env.MAINTENANCE_KEY;

    if (!validKey || maintenanceKey !== validKey) {
      this.logger.warn('Unauthorized maintenance attempt');
      throw new UnauthorizedException('Invalid maintenance key');
    }
  }

  @Post('populate-plaintext')
  async populatePlainText(
    @Headers('x-maintenance-key') maintenanceKey: string,
  ): Promise<MigrationResult> {
    this.validateMaintenanceKey(maintenanceKey);

    this.logger.log('Starting plainText population via API endpoint...');

    const result = await this.maintenanceService.populatePlainText();

    this.logger.log(
      `Migration completed: ${result.updated} updated, ${result.failed} failed`,
    );

    return result;
  }

  @Post('generate-embeddings')
  async generateEmbeddings(
    @Headers('x-maintenance-key') maintenanceKey: string,
  ): Promise<any> {
    this.validateMaintenanceKey(maintenanceKey);

    this.logger.log('Starting embeddings generation via API endpoint...');

    const result = await this.maintenanceService.generateAllEmbeddings();

    this.logger.log(
      `Embeddings generation completed: ${result.successful} successful, ${result.failed} failed, ${result.totalTokens} tokens used`,
    );

    return result;
  }
}
