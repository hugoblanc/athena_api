import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Page } from '../../../../core/page';
import { Content } from '../../../domain/content.entity';
import { GetLastContentPaginatedQuery } from './get-last-content-paginated.query';

@QueryHandler(GetLastContentPaginatedQuery)
export class GetLastContentPaginatedHandler
  implements IQueryHandler<GetLastContentPaginatedQuery> {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) { }

  async execute(query: GetLastContentPaginatedQuery) {
    const { requestedPage, terms } = query;

    let where: FindOptionsWhere<Content> | undefined;

    if (terms.isDefined) {
      where = {
        title: ILike(`%${terms.value}%`),
      };
    }

    const [contents, count] = await this.contentRepository.findAndCount({
      order: {
        publishedAt: 'DESC',
      },
      relations: ['images', 'metaMedia'],
      select: {
        id: true,
        contentId: true,
        title: true,
        publishedAt: true,
      },
      where,
      skip: requestedPage.elementToSkip,
      take: requestedPage.size,
    });

    return new Page(requestedPage, contents, count);
  }
}
