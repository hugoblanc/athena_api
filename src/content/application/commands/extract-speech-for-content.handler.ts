import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../domain/content.entity';
import { SpeechGeneratorService } from '../providers/speech-generator.service';
import { ExtractSpeechForContentCommand } from './extract-speech-for-content.command';

@CommandHandler(ExtractSpeechForContentCommand)
export class ExtractSpeechForContentHandler implements ICommandHandler<ExtractSpeechForContentCommand> {

  constructor(
    @InjectRepository(Content) private readonly repository: Repository<Content>,
    private readonly speechGeneratorService: SpeechGeneratorService
  ) { }


  async execute({ id }: ExtractSpeechForContentCommand): Promise<any> {
    let content: Content;
    try {
      content = await this.repository.findOneOrFail({ where: { id }, relations: { metaMedia: true, audio: true } });
    } catch (error) {
      throw new NotFoundException();
    }

    if (content.audio) {
      throw new ConflictException();
    }

    const audio = await this.speechGeneratorService.createAudioFromContent(content);
    content.audio = audio;
    await this.repository.save(content);
    return { audio };
  }
}
