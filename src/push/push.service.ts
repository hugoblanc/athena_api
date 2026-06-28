import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../law-proposal/infrastructure/prisma.service';

export interface WebPushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  /** vignette du contenu : grande image de la notification web (showNotification image) */
  image?: string;
  /** routage du SW : /content/:key/:id ou /medias/:key */
  key?: string;
  id?: string | number;
  url?: string;
  tag?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    // Le "subject" VAPID accepte une URL https (pas besoin d'email).
    const subject = process.env.VAPID_SUBJECT || 'https://www.athena-app.fr';
    if (pub && priv) {
      webpush.setVapidDetails(subject, pub, priv);
      this.configured = true;
    } else {
      this.logger.warn('VAPID non configuré — le Web Push est désactivé.');
    }
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  /**
   * Enregistre (ou met à jour) l'abonnement d'un appareil.
   * `userId` peut être null : abonnement anonyme (visiteur non connecté).
   */
  async saveSubscription(
    userId: number | null,
    sub: WebPushSubscriptionJson,
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent?.slice(0, 255),
      },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async removeSubscription(endpoint: string) {
    await this.prisma.pushSubscription
      .delete({ where: { endpoint } })
      .catch(() => undefined);
    return { success: true };
  }

  /** Suivre un média pour cet appareil (ciblage des notifs). No-op si déjà suivi. */
  async follow(endpoint: string, mediaKey: string) {
    const sub = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { id: true },
    });
    if (!sub) return { success: false };
    await this.prisma.pushFollow.upsert({
      where: { subscriptionId_mediaKey: { subscriptionId: sub.id, mediaKey } },
      create: { subscriptionId: sub.id, mediaKey },
      update: {},
    });
    return { success: true };
  }

  /** Ne plus suivre un média pour cet appareil. */
  async unfollow(endpoint: string, mediaKey: string) {
    const sub = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { id: true },
    });
    if (sub) {
      await this.prisma.pushFollow
        .delete({
          where: {
            subscriptionId_mediaKey: { subscriptionId: sub.id, mediaKey },
          },
        })
        .catch(() => undefined);
    }
    return { success: true };
  }

  /** Médias suivis par cet appareil (clés). */
  async followedMedias(endpoint: string): Promise<string[]> {
    const sub = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { follows: { select: { mediaKey: true } } },
    });
    return sub?.follows.map((f) => f.mediaKey) ?? [];
  }

  /** Diffuse aux appareils qui SUIVENT ce média (ciblage tranche 2). */
  async sendToMediaFollowers(mediaKey: string, payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { follows: { some: { mediaKey } } },
    });
    if (subs.length === 0) return;
    await this.send(subs, payload);
  }

  /**
   * Envoie une notif à une liste de subscriptions (fan-out).
   * Supprime automatiquement les abonnements expirés (404/410).
   */
  async send(
    subscriptions: { endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayload,
  ) {
    if (!this.configured) return;
    const data = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.removeSubscription(s.endpoint);
          } else {
            this.logger.error(`Push échoué (${err?.statusCode}): ${err?.body}`);
          }
        }
      }),
    );
  }

  /**
   * Diffuse aux abonnés ciblés par les préférences (media key + catégories).
   * Remplace le ciblage FCM-topics : filtrage par requête SQL sur les prefs.
   * NOTE : le filtrage fin par préférence reste à brancher sur la logique de
   * UserPreference.notificationTopics (cf. chantier notif-preferences).
   */
  async broadcast(payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany();
    await this.send(subs, payload);
  }
}
