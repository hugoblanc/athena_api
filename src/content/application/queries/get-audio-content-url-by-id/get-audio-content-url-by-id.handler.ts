import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Page } from '../../../../core/page';
import { Audio } from '../../../domain/audio.entity';
import { Content } from '../../../domain/content.entity';
import { GetAudioContentUrlByIdQuery } from './get-audio-content-url-by-id.query';

@QueryHandler(GetAudioContentUrlByIdQuery)
export class GetAudioContentUrlByIdHandler
  implements IQueryHandler<GetAudioContentUrlByIdQuery> {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) { }

  async execute(query: GetAudioContentUrlByIdQuery): Promise<Audio | undefined> {
    const { id } = query;

    const contentAndAudio = await this.contentRepository.findOne({
      relations: { audio: true },
      select: {
        audio: {
          id: true,
          url: true
        }
      },
      where: { id }
    });

    return contentAndAudio?.audio;
  }
}
