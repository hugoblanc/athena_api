import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaMedia } from './meta-media.entity';

@Injectable()
export class MetaMediaService {
  constructor(
    @InjectRepository(MetaMedia)
    private readonly repository: Repository<MetaMedia>,
  ) { }

  findAll(): Promise<MetaMedia[]> {
    return this.repository.find();
  }
}
