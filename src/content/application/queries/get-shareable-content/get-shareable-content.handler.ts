import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../../domain/content.entity';
import { ContentFactoryBuilder } from '../../../infrastructure/content-factory.builder';
import { GetShareableContentQuery } from './get-shareable-content.query';

@QueryHandler(GetShareableContentQuery)
export class GetShareableContentHandler implements IQueryHandler<GetShareableContentQuery>{

  constructor(@InjectRepository(Content) private readonly repository: Repository<Content>, private readonly contentFactoryBuilder: ContentFactoryBuilder) {

  }

  async execute(query: GetShareableContentQuery): Promise<any> {
    const { id } = query;
    console.log(id);

    const content = await this.repository.findOne({
      relations: { image: true, metaMedia: true },
      select: {
        image: {
          id: true,
          url: true,
        },
        title: true,
        id: true,
        contentType: true,
        contentId: true
      },
      where: {
        id
      }
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const originalUrlFactory = this.contentFactoryBuilder.createOriginalUrlFactory(content);

    const originalUrl = await originalUrlFactory.getOriginalUrl();

    console.log(JSON.stringify(content));
    return {
      image: content.image,
      title: content.title,
      originalUrl: originalUrl
    };
  }

}
