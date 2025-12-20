import { Controller, Get, Put, Body } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from '../application/auth.service';
import { UserService } from '../application/user.service';
import { User } from '@prisma/client';

/**
 * Controller pour gérer l'authentification et le profil utilisateur
 * Tous les endpoints de ce controller requièrent une authentification
 */
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  /**
   * GET /auth/me
   * Retourne le profil de l'utilisateur courant
   */
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      provider: user.provider,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * GET /auth/preferences
   * Retourne les préférences de l'utilisateur courant
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: User) {
    return this.userService.getOrCreatePreferences(user.id);
  }

  /**
   * PUT /auth/preferences
   * Met à jour les préférences de l'utilisateur courant
   */
  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() data: any,
  ) {
    return this.userService.updatePreferences(user.id, data);
  }
}
