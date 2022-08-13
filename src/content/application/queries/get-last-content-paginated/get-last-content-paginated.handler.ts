import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../../../../core/page';
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
    const { requestedPage } = query;


    const [contents, count] = await this.contentRepository.findAndCount(
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
        skip: requestedPage.elementToSkip,
        take: requestedPage.size
      }
    );

    const page = new Page(requestedPage, contents, count);
    console.error(JSON.stringify(page));
    return page;

  }
}
