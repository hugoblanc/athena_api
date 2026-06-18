import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PushPayload, PushService } from './push.service';

/**
 * Relaie les événements `webpush.broadcast` (émis à la publication d'un contenu)
 * vers le Web Push PWA. Découplé du module content via l'EventEmitter global,
 * pour ne pas créer de dépendance ContentModule → PushModule.
 *
 * Tranche 1 : diffusion GLOBALE (tous les abonnés). Le ciblage par média
 * (suivre un média) viendra en tranche 2.
 */
@Injectable()
export class PushBroadcastListener {
  private readonly logger = new Logger(PushBroadcastListener.name);

  constructor(private readonly pushService: PushService) {}

  @OnEvent('webpush.broadcast')
  async handle(payload: PushPayload) {
    try {
      await this.pushService.broadcast(payload);
    } catch (e: any) {
      this.logger.error(`Web push broadcast échoué: ${e?.message}`);
    }
  }
}
