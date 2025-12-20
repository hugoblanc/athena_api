import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../law-proposal/infrastructure/prisma.service';
import { UserPreference } from '@prisma/client';

/**
 * Service pour gérer les préférences utilisateur
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère les préférences d'un utilisateur, les crée si elles n'existent pas
   * @param userId ID de l'utilisateur
   * @returns Les préférences de l'utilisateur
   */
  async getOrCreatePreferences(userId: number): Promise<UserPreference> {
    let preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.userPreference.create({
        data: {
          userId,
          notificationTopics: {},
          favoriteMedias: [],
        },
      });
    }

    return preferences;
  }

  /**
   * Met à jour les préférences d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param data Données à mettre à jour
   * @returns Les préférences mises à jour
   */
  async updatePreferences(
    userId: number,
    data: Partial<Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<UserPreference> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
