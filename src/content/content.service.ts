import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { from } from 'rxjs';
import { flatMap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';
import { MetaMediaService } from '../meta-media/meta-media.service';
import { Content } from './content.entity';
import { YoutubeService } from './youtube/youtube.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger('Content Service');
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private metaMediaService: MetaMediaService,
    private youtubeService: YoutubeService,
  ) { }

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

}
