import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PushPayload, PushService } from './push.service';

/**
 * Relaie les événements `webpush.broadcast` (émis à la publication d'un contenu)
 * vers le Web Push PWA. Découplé du module content via l'EventEmitter global,
 * pour ne pas créer de dépendance ContentModule → PushModule.
 *
 * Ciblage par média (tranche 2) : si l'event porte une `key` (clé média), on
 * n'envoie qu'aux appareils qui SUIVENT ce média. Sans clé : diffusion globale.
 */
@Injectable()
export class PushBroadcastListener {
  private readonly logger = new Logger(PushBroadcastListener.name);

  constructor(private readonly pushService: PushService) {}

  @OnEvent('webpush.broadcast')
  async handle(payload: PushPayload) {
    try {
      if (payload.key) {
        await this.pushService.sendToMediaFollowers(payload.key, payload);
      } else {
        await this.pushService.broadcast(payload);
      }
    } catch (e: any) {
      this.logger.error(`Web push échoué: ${e?.message}`);
    }
  }
}
