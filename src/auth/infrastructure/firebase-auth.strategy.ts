import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  providerId: string;
}

@Injectable()
export class FirebaseAuthStrategy {
  /**
   * Valide un Firebase ID token et retourne les informations utilisateur
   * @param idToken Le token JWT Firebase
   * @returns Les informations de l'utilisateur Firebase
   * @throws UnauthorizedException si le token est invalide
   */
  async validateToken(idToken: string): Promise<FirebaseUser> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified || false,
        providerId: decodedToken.firebase.sign_in_provider,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
