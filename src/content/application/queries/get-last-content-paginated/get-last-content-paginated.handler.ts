import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../../domain/content.entity';
import { GetLastContentPaginatedQuery } from './get-last-content-paginated.query';

@QueryHandler(GetLastContentPaginatedQuery)
export class GetLastContentPaginatedHandler implements IQueryHandler<GetLastContentPaginatedQuery> {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    // private publisher: EventPublisher,
  ) { }

  async execute(query: GetLastContentPaginatedQuery) {
    const { page, size } = query;

    return this.contentRepository.find(
      {
        order: {
          publishedAt: 'DESC',
        },
        select: {
          id: true,
          contentId: true,
          title: true,
          publishedAt: true,
        },
        skip: (page - 1) * size,
        take: size
      }
    );
  }
}
