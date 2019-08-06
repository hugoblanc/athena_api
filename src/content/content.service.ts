import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Content } from './content.entity';
import { Repository } from 'typeorm';
import { MetaMedia } from '../meta-media/meta-media.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) { }

  findAll(): Promise<Content[]> {
    return this.contentRepository.find();
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
