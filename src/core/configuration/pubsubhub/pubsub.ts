import pubSubHubbub = require('pubsubhubbub');
import { Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IYoutubeFeed } from './Iyoutube-feed';
/**
 * Cette classe est un serveru  qui suis le protocol pubsubhubhub indiqué par google pour s'abonner au notif youtube
 * Elle nous permet d'être avertis quand l'une des video de la chaine que l'on suis subit des modification
 * ces modification comporte la publication - modification du titre - modification de la description
 *  https://developers.google.com/youtube/v3/guides/push_notifications
 */
export class PubSub {

  constructor() { }

  private readonly logger = new Logger('PubSub');
  // L'url de callback pour le sotification
  private static CALLBACK_URL = 'http://athena-api.caprover.athena-app.fr:8081';
  // Le hub par lequel on passe pour s'abonner en pubsubhubhub
  private static HUB = 'http://pubsubhubbub.appspot.com/';

  // Les url cibles de notre abonnement
  private static URLS = [
    'https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCdnaDhU-LDQrIEEmSIfq0-Q',
    'https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCGBpxWJr9FNOcFYA5GkKrMg',
    'https://www.youtube.com/xml/feeds/videos.xml?channel_id=UCVeMw72tepFl1Zt5fvf9QKQ',
  ];

  /**
   * La methode qui permet d'initialiser notre serveur de feed atom
   */
  public init(): Observable<string> {
    // Création du serveur de sousscription au feed atom
    const pubSubSubscriber = this.createServer();
    // Setup des listener qui nous avertirons quand on sera abonné
    this.setupSubscribeListener(pubSubSubscriber);
    // On déclenche les ordre d'abonnement
    this.subscribeAll(PubSub.URLS, pubSubSubscriber);
    // Création de l'observable qui se déclenchera a chaque notification
    const youtubeFeed$ = this.observeFeed(pubSubSubscriber);
    // Démarrage du serveur sur le port indiqué
    pubSubSubscriber.listen(3001);
    // On renvoi l'observable qui nous avertira des changement effetuer
    return youtubeFeed$;
  }

  private createServer() {
    const option = { callbackUrl: PubSub.CALLBACK_URL };
    const pubSubSubscriber = pubSubHubbub.createServer(option);
    return pubSubSubscriber;
  }

  private setupSubscribeListener(pubSubSubscriber: any) {
    this.logger.log('Pubsub - listener - subscribe OK');
    pubSubSubscriber.on('subscribe', (data) => {
      this.logger.log(data.topic + ' subscribed');
    });
  }

  private observeFeed(pubSubSubscriber: any): Observable<string> {
    // Création du hot observabe qui sera déclanché a chaque fois qu'il y a une nouvelle notif
    const youtubeFeed$ = new Observable<string>((observer) => {
      // On doit s'abonner a l'evenement feed
      pubSubSubscriber.on('feed', (data) => {
        // Convertion du buffer en string
        const youtubeFeed = data.feed.toString();
        // Emission du flux dans l'observable
        observer.next(youtubeFeed);
      });
    });
    return youtubeFeed$;
  }

  private subscribeAll(urls: string[], pubSubSubscriber: any) {
    this.logger.log('Pubsub - listener - listen OK');
    // Pour pouvoir subscribe on doit attendre que le serveur soit en mode écoute
    pubSubSubscriber.on('listen', () => {
      for (const url of urls) {
        // On subscribe la liste entière des lien de la liste
        this.subscribe(url, pubSubSubscriber);
      }
    });
  }

  private subscribe(url: string, pubSubSubscriber) {
    // en cas d'erreur on affiche lerreur
    const errCall = (err) => {
      if (err) {
        this.logger.error(err);
      }
    };
    // On s'abonne au lien en passant par le hub spécifié
    pubSubSubscriber.subscribe(url, PubSub.HUB, errCall);
  }

}
