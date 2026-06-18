import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator';
import { OptionalAuth } from '../auth/infrastructure/decorators/optional-auth.decorator';
import { Public } from '../auth/infrastructure/decorators';
import {
  PushService,
  WebPushSubscriptionJson,
} from './push.service';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  /** Clé VAPID publique pour l'abonnement côté client. */
  @Public()
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  /**
   * Enregistre l'abonnement push de l'appareil. Auth optionnelle : lié à l'user
   * si un Bearer valide est fourni, sinon abonnement anonyme (opt-in depuis un
   * lien partagé, visiteur non connecté).
   */
  @OptionalAuth()
  @Post('subscribe')
  subscribe(
    @CurrentUser() user: User | undefined,
    @Body() sub: WebPushSubscriptionJson,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.pushService.saveSubscription(user?.id ?? null, sub, userAgent);
  }

  /** Désabonne l'appareil (par endpoint, pas besoin d'être connecté). */
  @Public()
  @Post('unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.removeSubscription(body.endpoint);
  }
}
