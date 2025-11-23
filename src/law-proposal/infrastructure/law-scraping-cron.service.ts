import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
import { LawScrapingService } from '../application/law-scraping.service';
import { LawSimplificationService } from '../application/law-simplification.service';

@Injectable()
export class LawScrapingCronService {
  private readonly logger = new Logger(LawScrapingCronService.name);

  constructor(
    private lawScrapingService: LawScrapingService,
    private lawSimplificationService: LawSimplificationService,
  ) {}

  /**
   * Scraping quotidien des nouvelles propositions de loi
   * Tous les jours à 2h du matin
   *
   * DÉSACTIVÉ PAR DÉFAUT - Décommenter le décorateur @Cron pour activer
   */
  // @Cron('0 0 2 * * *')
  async dailyScraping() {
    this.logger.log('Starting daily law proposal scraping');

    try {
      const result = await this.lawScrapingService.scrapNewProposals(20);
      this.logger.log(`Daily scraping completed: ${JSON.stringify(result)}`);

      // Lancer la simplification asynchrone
      await this.lawSimplificationService.processQueue();

      this.logger.log('Daily simplification completed');

    } catch (error) {
      this.logger.error('Error during daily scraping:', error);
    }
  }
}
