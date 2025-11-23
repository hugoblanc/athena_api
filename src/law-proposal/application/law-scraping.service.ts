import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { AssembleeNationaleScraper } from '../scrapers/assemblee-nationale-scraper';
import { PropositionScraper } from '../scrapers/proposition-scraper';
import type { PropositionLoi, Depute as DeputeData } from '../scrapers/types';
import { Depute, LawProposal } from '@prisma/client';

@Injectable()
export class LawScrapingService {
  private readonly logger = new Logger(LawScrapingService.name);

  constructor(
    private prisma: PrismaService,
    private assembleeNationaleScraper: AssembleeNationaleScraper,
    private propositionScraper: PropositionScraper,
  ) {}

  /**
   * Initialise les propositions de loi (endpoint manuel)
   */
  async initializeProposals(limit: number): Promise<{ created: number; skipped: number }> {
    this.logger.log(`Initializing proposals with limit ${limit}`);
    return this.scrapAndPersist(limit);
  }

  /**
   * Scrape les nouvelles propositions (cron quotidien)
   */
  async scrapNewProposals(limit: number = 20): Promise<{ created: number; skipped: number }> {
    this.logger.log(`Scraping new proposals with limit ${limit}`);
    return this.scrapAndPersist(limit);
  }

  /**
   * Logique commune de scraping et persistance
   */
  private async scrapAndPersist(limit: number): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    try {
      // 1. Récupérer la liste des propositions
      this.logger.log('Fetching proposals list...');
      const propositionsToProcess = await this.assembleeNationaleScraper.fetchPropositionsDeLoi(0, limit);
      this.logger.log(`Found ${propositionsToProcess.length} proposals to process`);

      // 2. Pour chaque proposition
      for (const resume of propositionsToProcess) {
        try {
          // Vérifier si la proposition existe déjà
          const exists = await this.propositionExists(resume.numero);

          if (exists) {
            this.logger.log(`Proposition ${resume.numero} already exists, skipping`);
            skipped++;
            continue;
          }

          // Scraper les détails
          this.logger.log(`Scraping proposition ${resume.numero}...`);
          const propositionData = await this.propositionScraper.scrapeProposition(resume.url);

          if (!propositionData) {
            this.logger.warn(`Failed to scrape proposition ${resume.numero}`);
            continue;
          }

          // Sauvegarder
          await this.saveProposition(propositionData);
          created++;
          this.logger.log(`✅ Proposition ${resume.numero} saved successfully`);

          // Rate limiting
          await this.delay(2000);

        } catch (error) {
          this.logger.error(`Error processing proposition ${resume.numero}:`, error);
          continue;
        }
      }

      this.logger.log(`Scraping completed: ${created} created, ${skipped} skipped`);
      return { created, skipped };

    } catch (error) {
      this.logger.error('Error during scraping:', error);
      throw error;
    }
  }

  /**
   * Vérifie si une proposition existe déjà
   */
  private async propositionExists(numero: string): Promise<boolean> {
    const count = await this.prisma.lawProposal.count({ where: { numero } });
    return count > 0;
  }

  /**
   * Sauvegarde une proposition complète avec toutes ses relations
   */
  private async saveProposition(data: PropositionLoi): Promise<LawProposal> {
    // 1. Déduplication de l'auteur principal
    const auteur = await this.findOrCreateDepute(data.auteur);

    // 2. Déduplication des co-signataires
    const coSignataireIds: number[] = [];
    if (data.coSignataires && data.coSignataires.length > 0) {
      for (const cosig of data.coSignataires) {
        const deputeEntity = await this.findOrCreateDepute(cosig);
        coSignataireIds.push(deputeEntity.id);
      }
    }

    // 3. Créer la proposition avec ses relations imbriquées
    const lawProposal = await this.prisma.lawProposal.create({
      data: {
        numero: data.numero,
        titre: data.titre,
        legislature: data.legislature,
        typeProposition: data.typeProposition,
        dateMiseEnLigne: new Date(data.dateMiseEnLigne),
        dateDepot: data.dateDepot ? new Date(data.dateDepot) : null,
        description: data.description,
        urlDocument: data.urlDocument,
        urlDossierLegislatif: data.urlDossierLegislatif,
        version: data.version,
        simplificationStatus: 'pending',
        auteurId: auteur.id,
        coSignataires: {
          connect: coSignataireIds.map(id => ({ id })),
        },
        // 4. Créer les sections et articles en cascade
        sections: {
          create: data.sections.map(sectionData => ({
            type: sectionData.type,
            titre: sectionData.titre,
            texte: sectionData.texte,
            articles: {
              create: sectionData.articles?.map(articleData => ({
                numero: articleData.numero,
                titre: articleData.titre,
                texte: articleData.texte,
              })) || [],
            },
          })),
        },
        // 5. Créer les amendements (si présents)
        amendements: data.amendements && data.amendements.length > 0 ? {
          create: data.amendements.map(amendData => ({
            numero: amendData.numero,
            date: new Date(amendData.date),
            auteur: amendData.auteur,
            statut: amendData.statut,
            url: amendData.url,
          })),
        } : undefined,
      },
    });

    return lawProposal;
  }

  /**
   * DÉDUPLICATION DES DÉPUTÉS
   * Récupère ou crée un député (évite les doublons)
   */
  private async findOrCreateDepute(deputeData: DeputeData): Promise<Depute> {
    // 1. PRIORITÉ : Recherche par acteurRef (clé métier forte)
    if (deputeData.acteurRef) {
      let depute = await this.prisma.depute.findUnique({
        where: { acteurRef: deputeData.acteurRef },
      });

      if (depute) {
        // Député trouvé → Mise à jour des infos (groupe politique, photo)
        return await this.prisma.depute.update({
          where: { id: depute.id },
          data: {
            groupePolitique: deputeData.groupePolitique,
            groupePolitiqueCode: deputeData.groupePolitiqueCode || 'UNKNOWN',
            photoUrl: deputeData.photoUrl || depute.photoUrl,
            urlDepute: deputeData.urlDepute || depute.urlDepute,
          },
        });
      }
    }

    // 2. FALLBACK : Si pas d'acteurRef (scraping HTML), chercher par nom + groupe
    if (deputeData.groupePolitiqueCode) {
      const depute = await this.prisma.depute.findFirst({
        where: {
          nom: deputeData.nom,
          groupePolitiqueCode: deputeData.groupePolitiqueCode,
        },
      });

      if (depute) {
        // Enrichir avec acteurRef si on ne l'avait pas avant
        return await this.prisma.depute.update({
          where: { id: depute.id },
          data: {
            acteurRef: deputeData.acteurRef || depute.acteurRef,
            photoUrl: deputeData.photoUrl || depute.photoUrl,
            urlDepute: deputeData.urlDepute || depute.urlDepute,
          },
        });
      }
    }

    // 3. Aucun doublon trouvé → Créer un nouveau député
    return await this.prisma.depute.create({
      data: {
        nom: deputeData.nom,
        groupePolitique: deputeData.groupePolitique,
        groupePolitiqueCode: deputeData.groupePolitiqueCode || 'UNKNOWN',
        photoUrl: deputeData.photoUrl,
        urlDepute: deputeData.urlDepute,
        acteurRef: deputeData.acteurRef,
      },
    });
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
