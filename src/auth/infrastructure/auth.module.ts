import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../law-proposal/infrastructure/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from '../application/auth.service';
import { UserService } from '../application/user.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';

/**
 * Module d'authentification Firebase
 * @Global pour rendre les services disponibles partout sans import explicite
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    PrismaService,
    AuthService,
    UserService,
    FirebaseAuthStrategy,
    FirebaseAuthGuard,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard, // Applique le guard globalement à tous les endpoints
    },
  ],
  exports: [AuthService, UserService, FirebaseAuthStrategy],
})
export class AuthModule {}
