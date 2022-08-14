import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { from, of } from 'rxjs';

/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Ce service de notification à la responsabilité de l'envoi des notifications
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  /**
   * Cette methode se charge d'envoyer une liste de message
   * @param messages la liste de message a envoyer
   */
  sendMessage(messages: any[]) {
    if (messages == null || !Array.isArray(messages) || messages.length === 0) {
      return;
    }

    // On ne peut pas envoyer tout les message car sinon on duplique les notification ... dommage
    this.logger.log(messages[0]);

    if (process.env.SEND_NOTIFICATION === 'false') {
      this.logger.log("Notification disabled");
      return;
    }

    from(admin.messaging().send(messages[0])).subscribe(
      resultSend => {
        this.logger.log('Successfully sent message');
        this.logger.log(messages[0]);
      },
      error => {
        this.logger.error('Error sending message');
        this.logger.error(JSON.stringify(error));
      },
    );
  }

  /**
   * Cette methode se charge de créer la liste de message associé au donnés et conditions
   * @param title Le titre de la notification
   * @param body le body de la notification
   * @param key la clé du metaMedia ciblé par la notification elle est utilisé pour afficher le bon contenu dans l'app
   * @param id l'id de la ressources en question, elle est utilisé pour afficher le bon contenu dans l'app
   * @param conditions un tableau de string qui permet d'indiquer quel catégorie sont dans larticle
   * Malheureusement nous n'avons droit qu'a 5 topic par condition de notif, on choisi donc d'enoyer plusieur notif quand il
   * y a plus de 5 critères
   */
  static createMessage(
    title: string,
    body: string,
    key: string,
    id: string,
    conditions?: string[],
  ) {
    const messages = [];

    // En cas de condition null on ajoute quand même a condition initial d'abonnement au média
    if (conditions == null) {
      conditions = NotificationService.createConditionFromKeyAndCategories(key);
    }

    for (const condition of conditions) {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          title,
          body,
          key,
          id,
        },
        condition,
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      };
      messages.push(message);
    }

    return messages;
  }

  static createConditionFromKeyAndCategories(
    key: string,
    categories?: number[],
  ) {
    if (!key) {
      throw new Error(
        "La clé n'est pas présente pour envoyer la notification ",
      );
    }

    // Dans tout les cas la clé devrait être la
    let condition = NotificationService.createInitialTopic(key);
    if (!Array.isArray(categories)) {
      return [condition];
    }

    const conditions = [];

    // On va itéré sur chaque id de categorie
    for (let i = 0; i < categories.length; i++) {
      const id = categories[i];
      // On concatène l'anti catégorie
      // => Si il y a ce topic ça signifie que l'utilisateur s'est expressement désabonné
      // Si le topic n'est pas présent ça signifie qu'il est toujours abonnée (abonné par defaut)
      condition += ` && !('${key}-${id}' in topics)`;
      // Si on est en modulo 4 on commence une nouvelle condition (5 topic max par condition)
      if ((i + 1) % 4 === 0) {
        // Alors on pousse la condition actuelle dans le tableau
        conditions.push(condition);
        // et on en commence une nouvelle
        condition = NotificationService.createInitialTopic(key);
      }
    }

    // A la fin on est pas sur de s'être arrété sur un mutliple de 4
    // Donc si on vient pas de reinit on insère dans le tableau
    if (condition !== NotificationService.createInitialTopic(key)) {
      conditions.push(condition);
    }
    return conditions;
  }

  static createInitialTopic(mediaKey: string) {
    return `'${mediaKey}' in topics `;
  }
}
