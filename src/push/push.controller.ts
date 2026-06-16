import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator';
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

  /** Enregistre l'abonnement push de l'appareil (authentifié). */
  @Post('subscribe')
  subscribe(
    @CurrentUser() user: User,
    @Body() sub: WebPushSubscriptionJson,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.pushService.saveSubscription(user.id, sub, userAgent);
  }

  /** Désabonne l'appareil (authentifié). */
  @Post('unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.removeSubscription(body.endpoint);
  }
}
