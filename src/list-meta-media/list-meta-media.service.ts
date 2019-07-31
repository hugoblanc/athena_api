import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListMetaMedia } from './list-meta-media.entity';

@Injectable()
export class ListMetaMediaService {
  constructor(
    @InjectRepository(ListMetaMedia)
    private readonly listMetaMediaRepository: Repository<ListMetaMedia>,
  ) { }

  findAll(): Promise<ListMetaMedia[]> {
    return this.listMetaMediaRepository.find();
  }
}
