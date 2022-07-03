import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListMetaMedia } from './list-meta-media.entity';

/**
 * *~~~~~~~~~~~~~~~~~~~
 * Author: HugoBlanc |
 * *~~~~~~~~~~~~~~~~~~~
 * Le service des lsite de méta media
 * Une liste de meta media est une objet qui a un titre et qui comporte un liste de meta media
 * Les titres sont visible dans l'application mobile, c'est genre "Les vidéos" " Presse écrite"
 * *~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */
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
