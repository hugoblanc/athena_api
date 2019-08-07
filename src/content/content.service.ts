import { Injectable } from '@nestjs/common';
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
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private metaMediaService: MetaMediaService,
    private youtubeService: YoutubeService,
  ) { }

  save(content: Content): Promise<Content> {
    console.log(content);
    return this.contentRepository.save(content);
  }

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
  }

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
    return this.contentRepository.find({ where: { metaMedia }, order: { date: 'ASC' }});
  }

}
