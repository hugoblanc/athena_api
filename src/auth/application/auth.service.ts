import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../law-proposal/infrastructure/prisma.service';
import { FirebaseUser } from '../infrastructure/firebase-auth.strategy';
import { User } from '@prisma/client';

/**
 * Service pour gérer l'authentification et la synchronisation des utilisateurs
 */
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Synchronise un utilisateur Firebase avec la base de données PostgreSQL
   * - Crée l'utilisateur s'il n'existe pas
   * - Met à jour lastLoginAt et les infos de profil si l'utilisateur existe déjà
   * @param firebaseUser Informations de l'utilisateur provenant de Firebase Auth
   * @returns L'utilisateur PostgreSQL synchronisé
   */
  async syncUser(firebaseUser: FirebaseUser): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (existingUser) {
      // Mettre à jour la dernière connexion et les infos du profil
      // (au cas où l'utilisateur aurait changé son nom/photo dans Firebase)
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLoginAt: new Date(),
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoUrl: firebaseUser.photoURL,
        },
      });
    }

    // Créer un nouvel utilisateur
    return this.prisma.user.create({
      data: {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoUrl: firebaseUser.photoURL,
        provider: firebaseUser.providerId,
        isAnonymous: false,
      },
    });
  }

  /**
   * Récupère un utilisateur par son ID PostgreSQL
   * @param id ID de l'utilisateur
   * @returns L'utilisateur avec ses préférences, ou null
   */
  async getUserById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
      },
    });
  }

  /**
   * Récupère un utilisateur par son Firebase UID
   * @param firebaseUid UID Firebase de l'utilisateur
   * @returns L'utilisateur avec ses préférences, ou null
   */
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
      include: {
        preferences: true,
      },
    });
  }
}
