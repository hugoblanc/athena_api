import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { AuthService } from '../application/auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from './decorators/optional-auth.decorator';

/**
 * Guard global pour vérifier l'authentification Firebase sur tous les endpoints
 * Supporte les décorateurs @Public() et @OptionalAuth()
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebaseAuthStrategy: FirebaseAuthStrategy,
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifier si l'endpoint est marqué comme public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Vérifier si l'authentification est optionnelle
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Pas de header Authorization
    if (!authHeader) {
      if (isOptionalAuth) {
        return true; // Permettre la requête sans utilisateur
      }
      throw new UnauthorizedException('No authorization header');
    }

    // Extraire le token
    const token = authHeader.replace('Bearer ', '');

    try {
      // Vérifier le token Firebase
      const firebaseUser = await this.firebaseAuthStrategy.validateToken(
        token,
      );

      // Synchroniser l'utilisateur avec PostgreSQL
      const user = await this.authService.syncUser(firebaseUser);

      // Attacher l'utilisateur à la requête pour utilisation dans les controllers
      request.user = user;

      return true;
    } catch (error) {
      if (isOptionalAuth) {
        return true; // Permettre la requête même si le token est invalide
      }
      throw new UnauthorizedException(error.message);
    }
  }
}
