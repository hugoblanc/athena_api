import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { empty, forkJoin, from, Observable, of } from 'rxjs';
import { filter, flatMap, map, mergeMap, tap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { YoutubeFeed } from '../../core/configuration/pubsubhub/youtube-feed';
import { Page } from '../../core/page';
import { RequestedPageValueType } from '../../core/page-number.value-type';
import { arrayMap } from '../../core/rxjs/array-map';
import { MetaMediaType } from '../../meta-media/meta-media-type.enum';
import { MetaMedia } from '../../meta-media/meta-media.entity';
import { MetaMediaService } from '../../meta-media/meta-media.service';
import { Post } from '../../models/post';
import { NotificationService } from '../../providers/notification-service';
import { PostService } from '../../providers/post-service';
import { Content } from '../domain/content.entity';
import { YoutubeService } from './youtube/youtube.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostsCreatedEvent } from './events/posts-created.event';

@Injectable()
export class ContentService {
  private static PAGER_SIZE = 10;

  private readonly logger = new Logger(ContentService.name);
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private metaMediaService: MetaMediaService,
    private youtubeService: YoutubeService,
    private postService: PostService,
    private notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cette method permet d'envoyer une notification basé sur un contenu
   * @param content Le contenu utilisé pour créer la notification
   */
  sendVideoNotification(content: Content) {
    const messages = NotificationService.createMessage(
      'Nouvelle vidéo de ' + content.metaMedia.title,
      content.title,
      content.metaMedia.key,
      content.id.toString(),
    );

    this.notificationService.sendMessage(messages);
  }

  sendPostNotification(post: Post) {
    const message = post.toNotification();
    this.notificationService.sendMessage(message);
  }

  /**
   * Cette methode permet d'initialiser le contenu d'un media youtube
   * En mettant l'id de la playlist dans le champ 'url' du metamedia et en appelant
   * cette route (initMediaCOntent) l'api se charge d'intégrer l'ensemble des videos du média en question
   * @param mediaKey le media cible a initialiser
   */
  initMediaContent(mediaKey: string) {
    let tmpMetaMedia;
    const metaMedia$ = from(this.metaMediaService.findByKey(mediaKey)).pipe(
      // On vérifie que le metaMedia n'est pas null
      filter((metaMedia: MetaMedia) => {
        tmpMetaMedia = metaMedia; // On stock dans une variable temporaire pour réutilise dans les autres appel
        const isNull = metaMedia != null;
        // Si c'est null on peut rien faire
        if (!isNull) {
          this.logger.error(
            `Le metamedia de clé: ${mediaKey} n'a pas été trouvé`,
          );
        }
        return isNull;
      }),
      // Récupération du contenu en bdd du metamedia
      mergeMap(metaMedia => this.findByMediaKey(metaMedia.key)),
      // On vérifie qu'il n'y a pas déjà de contenu pour le metaMEdia en question'
      filter((contents: Content[]) => {
        // S'il y a deja du contenu on ne doit rien faire car déjà init
        const contentIsEmpty = contents.length === 0;
        if (!contentIsEmpty) {
          this.logger.log(
            `Le metaMedia ${tmpMetaMedia.key} à déjà été initialisé `,
          );
        }
        return contentIsEmpty;
      }),
      // Si tout les filtre sont passé on récupère le contenu du media
      mergeMap(() => {
        let getContent$;
        // On doit gérer l'initailisation en fonction des cas
        // Si c'est une init youtube c'est pas comme une init wordpress
        switch (tmpMetaMedia.type) {
          case MetaMediaType.YOUTUBE:
            getContent$ = this.youtubeService.getAllContentForTargetId(
              tmpMetaMedia,
            );
            break;
          case MetaMediaType.WORDPRESS:
            getContent$ = this.postService.getContent(tmpMetaMedia);
            break;
          default:
            this.logger.error(
              "Ce type de meta media n'est pas géré par la méthode d'initialisation",
            );
            break;
        }

        return getContent$;
      }),
      // Finalement on sauvegarde ça en bdd
      mergeMap((content: Content) => this.save(content)),
    );

    return metaMedia$;
  }

  public async pollingContent() {
    this.logger.log('Polling - triggered');

    const metaMedias$ = from(
      this.metaMediaService.findByType(MetaMediaType.WORDPRESS),
    );

    metaMedias$
      .pipe(
        arrayMap(metaMedia => this.savePostContent(metaMedia)),
        tap((postContents: { content: Content; post: Post }[]) =>
          this.postCreationSideEffects(postContents),
        ),
      )
      .subscribe((postContents: Array<{ content: Content; post: Post }>) => {
        if (postContents.length > 0) {
          this.logger.log('Polling - success');
          postContents.forEach(pC =>
            this.logger.log('Content id: ' + pC.content.id),
          );
        } else {
          this.logger.log('Polling - success - No content');
        }
      });
  }

  public async dealWithAtomFeed(feed: YoutubeFeed) {
    const metaMedia = await this.metaMediaService.findByRessource(
      feed.metaMediaId,
    );
    const content = await this.findByContentId(feed.id);

    // Si on ne trouve pas le meta media c'est surement une mauvaise playlist
    if (metaMedia == null) {
      this.logger.warn(
        'Athena - Youtube playlist feed not recognized: ' + feed.metaMediaId,
      );
      return;
    }

    let dealWithFeed$: Observable<Content>;
    if (feed instanceof YoutubeFeed) {
      this.logger.log('Youtube feed detected');
      dealWithFeed$ = this.youtubeService.dealWithNewFeed(
        content,
        metaMedia,
        feed,
      );
    } else {
      dealWithFeed$ = empty();
    }

    const saveAndNotif$ = dealWithFeed$.pipe(
      flatMap(contentFeed => from(this.save(contentFeed))),
      filter(() => content == null),
      filter(data => data != null),
      tap((currentContent: Content) =>
        this.sendVideoNotification(currentContent),
      ),
    );

    saveAndNotif$.subscribe((finalContent: Content) => {
      this.logger.log('Youtube content edita ' + finalContent.id);
    });
  }

  save(content: Content): Promise<Content> {
    this.logger.log('Save Content contentId: ' + content.contentId);
    return this.contentRepository.save(content);
  }

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
  }

  async findLastContent() {
    return this.contentRepository.find({
      order: {
        publishedAt: 'DESC',
      },
      select: {
        id: true,
        contentId: true,
        title: true,
        publishedAt: true,
      },
      take: 20,
    });
  }

  findById(id: number): Promise<Content> {
    return this.contentRepository.findOne({
      relations: { image: true, metaMedia: true, audio: true },
      where: { id },
    });
  }

  findByContentId(id: string): Promise<Content> {
    this.logger.log('Find content by content id: ' + id);
    return this.contentRepository.findOne({
      relations: { image: true, metaMedia: true },
      where: { contentId: id },
    });
  }

  /**
   * Cette methode renvoi une liste de content pour un meta meia cible
   *
   * @param key la clé du metamedia cible
   */
  async findByMediaKey(key: string): Promise<Content[]> {
    const all = await this.metaMediaService.findAll();
    const metaMedia = await this.metaMediaService.findByKey(key);
    if (metaMedia == null) {
      throw new NotFoundException(`La clé ${key} est introuvable`);
    }
    return this.contentRepository.find({
      relations: ['image', 'metaMedia'],
      where: { metaMedia },
      order: { publishedAt: 'DESC' },
    });
  }

  /**
   * Cette methode renvoi une liste de content pour un meta meia cible
   * @param key la clé du metamedia cible
   */
  async findPageByMediaKey(
    key: string,
    pageNumber: number,
  ): Promise<Page<Content>> {
    const requestPage = new RequestedPageValueType(
      pageNumber,
      ContentService.PAGER_SIZE,
    );
    // On s'assure au préalable que cette requète a du sens
    // C-a-d que metamedia n'est pas null
    const metaMedia = await this.metaMediaService.findByKey(key);
    if (metaMedia == null) {
      throw new NotFoundException(`La clé ${key} est introuvable`);
    }

    // Recherche des "PAGER_SIZE" élements a partir de la page "pageNumber"
    const [contents, count] = await this.contentRepository.findAndCount({
      where: { metaMedia },
      relations: ['image', 'metaMedia'],
      order: {
        publishedAt: 'DESC',
      },
      skip: ContentService.PAGER_SIZE * pageNumber,
      take: ContentService.PAGER_SIZE,
    });

    this.logger.log('Get page content clé: ' + key + ' page:' + pageNumber);
    const page = new Page<Content>(requestPage, contents, count);

    return page;
  }

  /**
   * Cette methode permet de récupérer les dernier post pour un metamedia données
   * @param metaMedia le metaMedia actuellement parcourus
   */
  private savePostContent(
    metaMedia: MetaMedia,
  ): Observable<{ content: Content; post: Post }[]> {
    // Récupération des post
    const getAndSave$ = this.postService.getPosts(metaMedia.url).pipe(
      mergeMap((posts: Post[]) => {
        // Transformation de l'ensemble des posts en tableau d'observable avec le metaMedia valorisé
        const checkSavePosts$ = posts.map(p => {
          p.metaMedia = metaMedia;
          return this.checkAndSave(p);
        });
        // Résolution parallélisé du tableau
        return forkJoin(checkSavePosts$);
      }),
      map((contents: { content: Content; post: Post }[] | null[]) =>
        contents.filter(c => c != null),
      ),
    );

    return getAndSave$;
  }

  /**
   * Cette methode a pour objectif de créer un observable qui va chercher le content en db pour voir si
   * il est présent, ensuite si le contenu est présent en bdd on s'arrète la, sinon on continue
   * @param metaMedia le metaMedia acutallement parcourru
   * @param post le post du meta media en question
   */
  private checkAndSave(
    post: Post,
  ): Observable<{ content: Content; post: Post }> {
    // Conversion de la promise en observable
    return from(this.findByContentId(post.id.toString())).pipe(
      // SI non on le sauvegarde après conversion du post en content
      mergeMap(content => {
        if (content == null) {
          return from(
            this.save(this.postService.convertPostToContent(post)),
          ).pipe(map((content: Content) => ({ content, post })));
        } else {
          return of(null);
        }
      }),
    );
  }

  private postCreationSideEffects(
    postContents: { content: Content; post: Post }[],
  ): void {
    const max_notification_to_send = 5;
    if (postContents.length < max_notification_to_send) {
      postContents.forEach(pC => this.sendPostNotification(pC.post));
    }

    const ids = postContents.map(pC => pC.content.id);

    this.eventEmitter.emit(
      PostsCreatedEvent.eventName,
      new PostsCreatedEvent(ids),
    );
  }
}
