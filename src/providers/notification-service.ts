import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { from, concat } from 'rxjs';

/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Ce service de notification à la respomssabilité de l'envoi des notifications
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
@Injectable()
export class NotificationService {

  sendMessage(messages: any[]) {
    // On vérifie qu'il y a bien des notificaiotn a envoyer
    if (messages != null && Array.isArray(messages) && messages.length > 0) {
      return;
    }

    // On creai tun tableau d'observable
    const notif$ = [];
    for (const message of messages) {
      notif$.push(from(admin.messaging().send(message)));
    }

    // On concat les obseravble et on execute l'ensemble des requete
    concat(...notif$).subscribe((resultSend) => {
      console.log('Successfully sent message:', resultSend);
    }, (error) => {
      console.log('Error sending message:', error);
    });
  }

  createMessage(title: string, body: string, key: string, id: string, conditions: string[]) {
    const messages = [];
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
      };
      messages.push(message);
    }

    return messages;
  }

  createConditionFromKeyAndCategories(key: string, categories?: number[]) {
    if (!key) {
      throw new Error('La clé n\'est pas présente pour envoyer la notification ');
    }

    // Dans tout les cas la clé devrait être la
    let condition = this.createInitialTopic(key);
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
      if ((i + 1 % 4) === 0) {
        // Alors on pousse la condition actuelle dans le tableau
        conditions.push(condition);
        // et on en commence une nouvelle
        condition = this.createInitialTopic(key);
      }
    }
    // A la fin on est pas sur de s'être arrété sur un mutliple de 4
    // Donc si on vient pas de reinit on insère dans le tableau
    if (condition !== this.createInitialTopic(key)) {
      conditions.push(condition);
    }

    return conditions;
  }

  private createInitialTopic(mediaKey: string) {
    return `'${mediaKey}' in topics `;
  }

}
