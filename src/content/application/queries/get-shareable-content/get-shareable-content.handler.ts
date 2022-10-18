import { IQueryHandler, QueryHandler, QueryHandlerType } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityRepository, Repository } from 'typeorm';
import { Content } from '../../../domain/content.entity';
import { GetShareableContentQuery } from './get-shareable-content.query';

@QueryHandler(GetShareableContentQuery)
export class GetShareableContentHandler implements IQueryHandler<GetShareableContentQuery>{

  constructor(@InjectRepository(Content) private readonly repository: Repository<Content>) {

  }

  async execute(query: GetShareableContentQuery): Promise<any> {
    const { id } = query;
    console.log(id);

    const shareableContent = await this.repository.findOne({
      relations: ['image'],
      select: {
        image: {
          id: true,
          url: true,
        },
        title: true,
        id: true
      },
      where: {
        id
      }
    });

    console.log(JSON.stringify(shareableContent));
    return shareableContent;
  }

}
