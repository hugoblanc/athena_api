import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../../domain/content.entity';
import { ExtractSpeechForContentCommand } from './extract-speech-for-content.command';
import { GenerateMissingAudiosCommand } from './generate-missing-audios.command';

@CommandHandler(GenerateMissingAudiosCommand)
export class GenerateMissingAudiosHandler
  implements ICommandHandler<GenerateMissingAudiosCommand>
{
  private readonly logger = new Logger(GenerateMissingAudiosHandler.name);

  constructor(
    @InjectRepository(Content)
    private readonly repository: Repository<Content>,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({ limit }: GenerateMissingAudiosCommand): Promise<{
    processed: number;
    failed: number;
    contentIds: number[];
  }> {
    this.logger.log(
      `Searching for ${limit} most recent contents without audio`,
    );

    // Rechercher les contenus les plus récents sans audio
    const contentsWithoutAudio = await this.repository
      .createQueryBuilder('content')
      .leftJoin('content.audio', 'audio')
      .leftJoinAndSelect('content.metaMedia', 'metaMedia')
      .where('content.audioId IS NULL')
      .orderBy('content.publishedAt', 'DESC')
      .take(limit)
      .getMany();

    this.logger.log(
      `Found ${contentsWithoutAudio.length} contents without audio`,
    );

    const contentIds: number[] = [];
    let processed = 0;
    let failed = 0;

    // Générer les audios un par un
    for (const content of contentsWithoutAudio) {
      try {
        this.logger.log(`Generating audio for content ${content.id}`);
        await this.commandBus.execute(
          new ExtractSpeechForContentCommand(content.id),
        );
        contentIds.push(content.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to generate audio for content ${content.id}: ${error.message}`,
          error.stack,
        );
        failed++;
      }
    }

    this.logger.log(
      `Audio generation complete: ${processed} succeeded, ${failed} failed`,
    );

    return {
      processed,
      failed,
      contentIds,
    };
  }
}
