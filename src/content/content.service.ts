import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { from, empty, Observable } from 'rxjs';
import { flatMap, filter } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { MetaMediaService } from '../meta-media/meta-media.service';
import { Content } from './content.entity';
import { YoutubeService } from './youtube/youtube.service';
import { YoutubeFeed } from '../core/configuration/pubsubhub/youtube-feed';
import { Page } from '../core/page';
import { IcreateNotifService } from '../core/icreate-notif-service.interface';
import { NotificationService } from '../providers/notification-service';

@Injectable()
export class ContentService implements IcreateNotifService<Content> {

  private static PAGER_SIZE = 10;

  private readonly logger = new Logger(ContentService.name);
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private metaMediaService: MetaMediaService,
    private youtubeService: YoutubeService,
    private notificationService: NotificationService,
  ) { }

  /**
   * Cette emthode permet de créer un contenu et en même temps
   * s'il s'agit d'une création (et pas d'un upadte) on envoi un notif
   * @param content Le contenu qui doit être créé
   */
  async saveAndNotifIfCreation(content: Content): Promise<Content> {
    const isCreation = (content.id == null);
    const video = await this.save(content);
    // Création de la notification
    if (isCreation) {
      const messages = this.createNotif(video, video.metaMedia.key);
      this.notificationService.sendMessage(messages);
    }
    return video;
  }

  createNotif(object: Content, key: string) {
    return this.notificationService.createMessage('Nouvelle vidéo de ' + object.metaMedia.title, object.title, key, object.id.toString());
  }

  save(content: Content): Promise<Content> {
    this.logger.log('Save Content ');
    return this.contentRepository.save(content);
  }

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
  }

  findById(id: number): Promise<Content> {
    this.logger.log('Find content by id: ' + id);
    return this.contentRepository.findOne({ where: { id } });
  }

  findByContentID(id: string): Promise<Content> {
    this.logger.log('Find content by content id: ' + id);
    return this.contentRepository.findOne({ where: { contentId: id } });
  }

  /**
   * Cette methode permet d'initialiser le contenu d'un media youtube
   * En mettant l'id de la playlist dans le champ 'url' du metamedia et en appelant
   * cette route (initMediaCOntent) l'api se charge d'intégrer l'ensemble des videos du média en question
   * @param mediaKey le media cible a initialiser
   */
  initMediaContent(mediaKey: string) {
    const metaMedia$ = from(this.metaMediaService.findByKey(mediaKey)).pipe(
      // filter((metaMedia: MetaMedia) => (metaMedia != null)),
      flatMap((metaMedia: MetaMedia) => this.youtubeService.getAllContentForTargetId(metaMedia)),
      flatMap((content: Content) => this.save(content)),
    );

    return metaMedia$;
  }

  async dealWithAtomFeed(feed: YoutubeFeed) {

    const metaMedia = await this.metaMediaService.findByRessource(feed.metaMediaId);
    const content = await this.findByContentID(feed.id);

    // Si on ne trouve pas le meta media c'est surement une mauvaise playlist
    if (metaMedia == null) {
      return;
    }

    let dealWithFeed$: Observable<Content>;
    if (feed instanceof YoutubeFeed) {
      this.logger.log('Youtube feed detected');
      dealWithFeed$ = this.youtubeService.dealWithNewFeed(content, metaMedia, feed);
    } else {
      dealWithFeed$ = empty();
    }

    dealWithFeed$ = dealWithFeed$.pipe(
      filter((data) => data != null),
      flatMap((currentContent: Content) => this.saveAndNotifIfCreation(currentContent)),
    );

    dealWithFeed$.subscribe((content) => {
      this.logger.log('Content updated id: ' + content.id);
    });
  }

  /**
   * Cette methode renvoi une liste de content pour un meta meia cible
   *
   * @param key la clé du metamedia cible
   */
  async findByMediaKey(key: string): Promise<Content[]> {
    const metaMedia = await this.metaMediaService.findByKey(key);
    if (metaMedia == null) {
      throw new Error('La clé ne correspond pas ');
    }
    return this.contentRepository.find({ where: { metaMedia }, order: { publishedAt: 'DESC' } });
  }

  /**
   * Cette methode renvoi une liste de content pour un meta meia cible
   * @param key la clé du metamedia cible
   */
  async findPageByMediaKey(key: string, pageNumber: number = 0): Promise<Page<Content>> {
    // On s'assure au préalable que cette requète a du sens
    // C-a-d que metamedia n'est pas null
    const metaMedia = await this.metaMediaService.findByKey(key);
    if (metaMedia == null) {
      throw new Error('La clé ne correspond pas ');
    }

    // Recherche des "PAGER_SIZE" élements a partir de la page "pageNumber"
    const contentsCounted = await this.contentRepository.findAndCount({
      where: { metaMedia },
      order: {
        publishedAt: 'DESC',
      },
      skip: ContentService.PAGER_SIZE * pageNumber,
      take: ContentService.PAGER_SIZE,
    });

    // on log l'étape
    this.logger.log('Get page content clé: ' + key + ' page:' + pageNumber);
    // Création du page content a renvoyer
    const page = new Page<Content>();
    page.count = contentsCounted[0].length;
    page.objects = contentsCounted[0];
    page.totalCount = contentsCounted[1];
    page.next = (page.totalCount > ((pageNumber + 1) * ContentService.PAGER_SIZE)) ? ++pageNumber : undefined;
    // On renvoi le résultat
    return page;
  }

}
