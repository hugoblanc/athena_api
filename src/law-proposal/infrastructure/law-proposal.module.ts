import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { LawProposalController } from './law-proposal.controller';
import { LawProposalService } from '../application/law-proposal.service';
import { LawScrapingService } from '../application/law-scraping.service';
import { LawSimplificationService } from '../application/law-simplification.service';
import { LawScrapingCronService } from './law-scraping-cron.service';
import { AssembleeNationaleScraper } from '../scrapers/assemblee-nationale-scraper';
import { PropositionScraper } from '../scrapers/proposition-scraper';
import { DeputeScraper } from '../scrapers/depute-scraper';
import { LawOgImageService } from '../og/law-og-image.service';
import { LawOgService } from '../og/law-og.service';
import { OG_STORAGE, VolumeOgStorage } from '../og/og-storage';

@Module({
  imports: [HttpModule],
  controllers: [LawProposalController],
  providers: [
    PrismaService,
    LawProposalService,
    LawScrapingService,
    LawSimplificationService,
    LawScrapingCronService,
    AssembleeNationaleScraper,
    PropositionScraper,
    DeputeScraper,
    LawOgImageService,
    LawOgService,
    { provide: OG_STORAGE, useClass: VolumeOgStorage },
  ],
  exports: [LawProposalService, LawOgService],
})
export class LawProposalModule {}
