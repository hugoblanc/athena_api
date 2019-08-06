import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
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

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
  }

  initMediaContent(mediaKey: string): void {
    const metaMedia$ = from(this.metaMediaService.findByKey(mediaKey));
    metaMedia$.pipe(
      // filter((metaMedia: MetaMedia) => (metaMedia != null)),
      map((metaMedia: MetaMedia) => this.youtubeService.getAllContentForTargetId(metaMedia)),
    );
  }
  /**
   * Cette methode renvoi une liste de content pour un meta meia cible
   *
  * @param key la clé du metamedia cible
   */
  findByMediaKey(key: string): Promise<Content[]> {
    return this.contentRepository.find({ where: { metaMedia: { key } }, order: { date: 'ASC' } });
  }

}
