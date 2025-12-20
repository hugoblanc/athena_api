import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Décorateur pour marquer un endpoint comme acceptant l'authentification optionnelle
 * L'endpoint fonctionne avec ou sans token, mais si un token valide est fourni,
 * l'utilisateur sera disponible via @CurrentUser()
 * Usage: @OptionalAuth()
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
