import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { Prisma } from '@prisma/client';
import { ListLawProposalsQueryDto } from '../dtos/law-proposal-list.dto';
import { LawProposalSummaryDto, LawProposalDetailDto } from '../dtos/law-proposal-response.dto';
import { SimplifiedData } from '../types/simplified.types';

@Injectable()
export class LawProposalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère toutes les propositions avec filtres et pagination
   */
  async findAllWithFilters(queryDto: ListLawProposalsQueryDto) {
    const { page = 1, limit = 20, sort = 'dateMiseEnLigne:desc' } = queryDto;

    // Construire les filtres WHERE
    const where: Prisma.LawProposalWhereInput = {};

    // Filtre par groupe politique
    if (queryDto['filter[groupePolitique]']) {
      const codes = queryDto['filter[groupePolitique]'].split(',');
      where.auteur = {
        groupePolitiqueCode: { in: codes },
      };
    }

    // Filtre par type de proposition
    if (queryDto['filter[typeProposition]']) {
      where.typeProposition = queryDto['filter[typeProposition]'];
    }

    // Filtre par période
    if (queryDto['filter[dateDebut]'] || queryDto['filter[dateFin]']) {
      where.dateMiseEnLigne = {};
      if (queryDto['filter[dateDebut]']) {
        where.dateMiseEnLigne.gte = new Date(queryDto['filter[dateDebut]']);
      }
      if (queryDto['filter[dateFin]']) {
        where.dateMiseEnLigne.lte = new Date(queryDto['filter[dateFin]']);
      }
    }

    // Filtre par statut de simplification
    if (queryDto['filter[simplificationStatus]']) {
      where.simplificationStatus = queryDto['filter[simplificationStatus]'];
    }

    // Construire l'orderBy
    const [sortField, sortOrder] = sort.split(':');
    const orderBy: Prisma.LawProposalOrderByWithRelationInput = {
      [sortField]: sortOrder as 'asc' | 'desc',
    };

    // Compter le total (query séparée pour performance)
    const total = await this.prisma.lawProposal.count({ where });

    // Récupérer les données
    const proposals = await this.prisma.lawProposal.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        auteur: true,
        coSignataires: true,
      },
      orderBy,
    });

    // Transformer en DTO
    const data: LawProposalSummaryDto[] = proposals.map(p => ({
      numero: p.numero,
      titre: p.titre,
      typeProposition: p.typeProposition,
      dateMiseEnLigne: p.dateMiseEnLigne,
      dateDepot: p.dateDepot,
      auteur: {
        nom: p.auteur.nom,
        groupePolitique: p.auteur.groupePolitique,
        groupePolitiqueCode: p.auteur.groupePolitiqueCode,
        photoUrl: p.auteur.photoUrl,
        urlDepute: p.auteur.urlDepute,
      },
      coSignatairesCount: p.coSignataires.length,
      simplified: p.simplifiedData ? {
        status: (p.simplifiedData as unknown as SimplifiedData).status,
        keyPoints: (p.simplifiedData as unknown as SimplifiedData).keyPoints,
      } : undefined,
    }));

    // Pagination
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Récupère une proposition par son numéro
   */
  async findByNumero(numero: string): Promise<LawProposalDetailDto | null> {
    const proposal = await this.prisma.lawProposal.findUnique({
      where: { numero },
      include: {
        auteur: true,
        coSignataires: true,
        sections: {
          include: {
            articles: true,
          },
        },
        amendements: true,
      },
    });

    if (!proposal) {
      return null;
    }

    // Transformer en DTO avec structure unified
    return {
      numero: proposal.numero,
      titre: proposal.titre,
      legislature: proposal.legislature,
      typeProposition: proposal.typeProposition,
      dateMiseEnLigne: proposal.dateMiseEnLigne,
      dateDepot: proposal.dateDepot,
      description: proposal.description,
      urlDocument: proposal.urlDocument,
      urlDossierLegislatif: proposal.urlDossierLegislatif,
      auteur: {
        nom: proposal.auteur.nom,
        groupePolitique: proposal.auteur.groupePolitique,
        groupePolitiqueCode: proposal.auteur.groupePolitiqueCode,
        photoUrl: proposal.auteur.photoUrl,
        urlDepute: proposal.auteur.urlDepute,
      },
      coSignataires: proposal.coSignataires.map(cs => ({
        nom: cs.nom,
        groupePolitique: cs.groupePolitique,
        groupePolitiqueCode: cs.groupePolitiqueCode,
        photoUrl: cs.photoUrl,
        urlDepute: cs.urlDepute,
      })),
      sections: proposal.sections.map(s => ({
        type: s.type,
        titre: s.titre,
        texte: s.texte,
        articles: s.articles.map(a => ({
          numero: a.numero,
          titre: a.titre,
          texte: a.texte,
        })),
      })),
      amendements: proposal.amendements.map(a => ({
        numero: a.numero,
        date: a.date,
        auteur: a.auteur,
        statut: a.statut,
        url: a.url,
      })),
      simplified: proposal.simplifiedData
        ? (proposal.simplifiedData as unknown as SimplifiedData)
        : undefined,
    };
  }

  /**
   * Récupère les propositions récentes
   */
  async findRecent(limit: number = 10): Promise<LawProposalSummaryDto[]> {
    const proposals = await this.prisma.lawProposal.findMany({
      take: limit,
      include: {
        auteur: true,
        coSignataires: true,
      },
      orderBy: { dateMiseEnLigne: 'desc' },
    });

    // Transformer en DTO avec structure unified
    return proposals.map(p => ({
      numero: p.numero,
      titre: p.titre,
      typeProposition: p.typeProposition,
      dateMiseEnLigne: p.dateMiseEnLigne,
      dateDepot: p.dateDepot,
      auteur: {
        nom: p.auteur.nom,
        groupePolitique: p.auteur.groupePolitique,
        groupePolitiqueCode: p.auteur.groupePolitiqueCode,
        photoUrl: p.auteur.photoUrl,
        urlDepute: p.auteur.urlDepute,
      },
      coSignatairesCount: p.coSignataires.length,
      simplified: p.simplifiedData ? {
        status: (p.simplifiedData as unknown as SimplifiedData).status,
        keyPoints: (p.simplifiedData as unknown as SimplifiedData).keyPoints,
      } : undefined,
    }));
  }

  /**
   * Statistiques sur les propositions
   */
  async getStats() {
    const [total, pending, completed, failed] = await Promise.all([
      this.prisma.lawProposal.count(),
      this.prisma.lawProposal.count({ where: { simplificationStatus: 'pending' } }),
      this.prisma.lawProposal.count({ where: { simplificationStatus: 'completed' } }),
      this.prisma.lawProposal.count({ where: { simplificationStatus: 'failed' } }),
    ]);

    return { total, pending, completed, failed };
  }
}
