import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PostsCreatedEvent } from './posts-created.event';
import { CommandBus } from '@nestjs/cqrs';
import { ExtractSpeechForContentCommand } from '../commands/extract-speech-for-content.command';

@Injectable()
export class AudioService {
  logger = new Logger(AudioService.name);
  constructor(private readonly commandBuse: CommandBus) {}

  @OnEvent(PostsCreatedEvent.eventName)
  async handlePostCreated({ ids }: PostsCreatedEvent) {
    if (ids.length === 0) {
      return;
    }

    if (ids.length > 10) {
      this.logger.warn(
        `More than 10 posts created at once. ${ids.length} posts created.`,
      );
      return;
    }

    this.logger.log(`Posts created. ${ids.length} posts created.`);
    for (const id of ids) {
      await this.commandBuse.execute(new ExtractSpeechForContentCommand(id));
    }
  }
}
