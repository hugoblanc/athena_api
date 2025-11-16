import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Content } from '../content/domain/content.entity';
import { TextFormatter } from '../content/application/providers/text-formatter.service';

export interface MigrationResult {
  processed: number;
  updated: number;
  failed: number;
  errors: Array<{ contentId: string; error: string }>;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly textFormatter: TextFormatter,
  ) {}

  async populatePlainText(): Promise<MigrationResult> {
    this.logger.log('Starting plainText population migration...');

    const contentRepository = this.dataSource.getRepository(Content);
    const contents = await contentRepository.find();

    this.logger.log(`Found ${contents.length} articles to process`);

    let processed = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ contentId: string; error: string }> = [];

    for (const content of contents) {
      try {
        // Convertir HTML en texte pur
        const plainText = this.textFormatter.htmlToText(content.description);

        // Mettre à jour l'entité
        content.plainText = plainText;
        await contentRepository.save(content);

        updated++;
        this.logger.debug(
          `[${processed + 1}/${contents.length}] Updated contentId: ${content.contentId} (${plainText.length} chars)`,
        );
      } catch (error) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        this.logger.error(
          `Error processing contentId: ${content.contentId}`,
          errorMsg,
        );
        errors.push({
          contentId: content.contentId,
          error: errorMsg,
        });
      }
      processed++;
    }

    const result: MigrationResult = {
      processed,
      updated,
      failed,
      errors,
    };

    this.logger.log(
      `Migration completed! Processed: ${processed}, Updated: ${updated}, Failed: ${failed}`,
    );

    return result;
  }
}
