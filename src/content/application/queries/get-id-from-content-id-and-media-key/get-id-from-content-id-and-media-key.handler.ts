
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../../domain/content.entity';
import { GetIdFromContentIdAndKeyQuery } from './get-id-from-content-id-and-media-key.query';

@QueryHandler(GetIdFromContentIdAndKeyQuery)
export class GetIdFromContentIdAndKeyHandler
  implements IQueryHandler<GetIdFromContentIdAndKeyQuery> {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) { }

  async execute(query: GetIdFromContentIdAndKeyQuery): Promise<Content> {
    const { key, contentId } = query;

    const id = await this.contentRepository.findOne({
      where: { contentId, metaMedia: { key } }
      ,
      select: { id: true }
    });

    return id;
  }
}
