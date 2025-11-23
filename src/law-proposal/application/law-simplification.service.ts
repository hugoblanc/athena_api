import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../infrastructure/prisma.service';
import { LawProposal, Prisma } from '@prisma/client';
import { SimplifiedData, isValidSimplifiedData } from '../types/simplified.types';

type LawProposalWithRelations = LawProposal & {
  auteur: { nom: string; groupePolitique: string };
  sections: Array<{
    titre: string;
    texte: string;
    articles: Array<{ numero: string; texte: string }>;
  }>;
};

@Injectable()
export class LawSimplificationService {
  private readonly logger = new Logger(LawSimplificationService.name);
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = process.env.LAW_SIMPLIFICATION_MODEL || 'gpt-4o-mini';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Traite les propositions en attente de simplification
   */
  async processQueue(batchSize: number = 5): Promise<void> {
    this.logger.log(`Processing simplification queue (batch size: ${batchSize})`);

    const pendingProposals = await this.prisma.lawProposal.findMany({
      where: { simplificationStatus: 'pending' },
      take: batchSize,
      include: {
        auteur: true,
        sections: {
          include: { articles: true },
        },
      },
    }) as LawProposalWithRelations[];

    if (pendingProposals.length === 0) {
      this.logger.log('No pending proposals to process');
      return;
    }

    this.logger.log(`Found ${pendingProposals.length} proposals to simplify`);

    for (const proposal of pendingProposals) {
      try {
        // Marquer comme en cours
        await this.prisma.lawProposal.update({
          where: { id: proposal.id },
          data: { simplificationStatus: 'processing' },
        });

        // Générer la version simplifiée
        this.logger.log(`Generating simplified version for proposition ${proposal.numero}...`);
        const simplifiedData = await this.generateSimplifiedVersion(proposal);

        // Sauvegarder
        await this.prisma.lawProposal.update({
          where: { id: proposal.id },
          data: {
            simplifiedData: simplifiedData as Prisma.InputJsonValue,
            simplificationStatus: 'completed',
          },
        });

        this.logger.log(`✅ Proposition ${proposal.numero} simplified successfully`);

      } catch (error) {
        this.logger.error(`Error simplifying proposition ${proposal.numero}:`, error);

        // Marquer comme échoué
        await this.prisma.lawProposal.update({
          where: { id: proposal.id },
          data: { simplificationStatus: 'failed' },
        });
      }

      // Rate limiting entre les appels OpenAI
      await this.delay(1000);
    }

    this.logger.log('Simplification queue processing completed');
  }

  /**
   * Génère la version simplifiée pour une proposition donnée
   */
  async generateSimplifiedVersion(lawProposal: LawProposalWithRelations): Promise<SimplifiedData> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.formatProposalForLLM(lawProposal);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' }, // Force JSON response
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const content = response.data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Parser le JSON
      const parsed = JSON.parse(content);

      // Valider et structurer la réponse
      const simplifiedData: SimplifiedData = {
        status: 'completed',
        generatedAt: new Date().toISOString(),
        keyPoints: parsed.keyPoints || [],
        exposeMotifs: parsed.exposeMotifs || [],
        articles: parsed.articles || [],
      };

      // Validation
      if (!isValidSimplifiedData(simplifiedData)) {
        throw new Error('Invalid simplified data structure from OpenAI');
      }

      return simplifiedData;

    } catch (error) {
      this.logger.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  /**
   * Formate la proposition pour le prompt OpenAI
   */
  private formatProposalForLLM(lawProposal: LawProposalWithRelations): string {
    let prompt = `Proposition de loi n°${lawProposal.numero}\n`;
    prompt += `Titre: ${lawProposal.titre}\n`;
    prompt += `Type: ${lawProposal.typeProposition}\n`;
    prompt += `Auteur: ${lawProposal.auteur.nom} (${lawProposal.auteur.groupePolitique})\n\n`;

    // Ajouter les sections
    if (lawProposal.sections && lawProposal.sections.length > 0) {
      for (const section of lawProposal.sections) {
        prompt += `\n## ${section.titre}\n\n`;

        // Si c'est la section des articles, lister les articles
        if (section.articles && section.articles.length > 0) {
          for (const article of section.articles) {
            prompt += `${article.numero}\n${article.texte}\n\n`;
          }
        } else {
          prompt += `${section.texte}\n\n`;
        }
      }
    }

    prompt += `\n\n---\n\nSimplifie cette proposition de loi en JSON structuré.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans aucun texte explicatif avant ou après.

Structure attendue :
- keyPoints : 3-4 phrases courtes résumant l'essentiel (qui propose, pourquoi, quel impact)
- exposeMotifs : décompose l'exposé des motifs en sections thématiques logiques
- articles : résume chaque article de manière accessible`;

    return prompt;
  }

  /**
   * Construit le prompt système pour OpenAI
   */
  private buildSystemPrompt(): string {
    return `Tu es un expert en droit législatif français.
Ta mission est de simplifier des propositions de loi pour les rendre compréhensibles en 30-60 secondes de lecture par un citoyen lambda.

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide suivant EXACTEMENT cette structure :

{
  "keyPoints": [
    "Point clé 1 (50-100 caractères)",
    "Point clé 2 (50-100 caractères)",
    "Point clé 3 (50-100 caractères)"
  ],
  "exposeMotifs": [
    {
      "ordre": 1,
      "titre": "Titre court (2-5 mots)",
      "texte": "Texte simplifié de 100-200 mots expliquant cette partie de l'exposé des motifs"
    }
  ],
  "articles": [
    {
      "ordre": 1,
      "numero": "Article 1",
      "resume": "Résumé concis de 30-80 mots de ce que fait cet article"
    }
  ]
}

Règles strictes :
- keyPoints : 3-4 phrases courtes (50-100 caractères chacune) résumant l'essentiel
- exposeMotifs : décompose l'exposé des motifs en sections thématiques avec titres courts et textes de 100-200 mots
- articles : résume chaque article en 30-80 mots, en gardant le numéro d'article original
- Utilise un français accessible, évite le jargon juridique
- Maximum 300-400 mots au total
- NE réponds QU'avec le JSON, aucun texte avant ou après`;
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
