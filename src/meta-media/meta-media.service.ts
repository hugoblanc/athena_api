import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaMedia } from './meta-media.entity';
import { MetaMediaType } from './meta-media-type.enum';

@Injectable()
export class MetaMediaService {
  constructor(
    @InjectRepository(MetaMedia)
    private readonly repository: Repository<MetaMedia>,
  ) { }

  findAll(): Promise<MetaMedia[]> {
    return this.repository.find();
  }

  findByKey(key: string): Promise<MetaMedia> {
    return this.repository.findOne({ where: { key } });
  }

  findByType(type: MetaMediaType): Promise<MetaMedia[]> {
    return this.repository.find({ where: { type } })
  }
}
